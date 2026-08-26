import { useEffect, useMemo, useState } from 'react';
import Decimal from 'decimal.js';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Calculate from '@mui/icons-material/Calculate';
import Delete from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import DateChip from './components/DateChip';
import TaskChip from './components/TaskChip';
import type { Project, Settings, Task } from './electron';

const CHIPS_KEY = 'ProjectChipsKey';
const CHIP_COLORS = ['#b8f2e6', '#c7f9cc', '#f9f7b8', '#ffd6a5', '#ffadad', '#ffc6ff', '#cdb4db', '#bde0fe'];

function rankOf(name: string, settings: Settings | null) {
    const words = settings?.project_sort_order ?? [];
    const index = words.findIndex((word) => name.includes(word));
    return index < 0 ? words.length : index;
}

function App() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [dates, setDates] = useState<string[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [chips, setChips] = useState<Task[]>([]);
    const [message, setMessage] = useState('取得中...');
    const [busy, setBusy] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [sortOrder, setSortOrder] = useState('');
    const [devTool, setDevTool] = useState(false);

    useEffect(() => {
        window.api.onInitDates(async (stats, nextSettings, nextDates, nextProjects) => {
            setSettings(nextSettings);
            setLoginId(nextSettings.login_id ?? '');
            setSortOrder((nextSettings.project_sort_order ?? []).join('\n'));
            setProjects(nextProjects ?? []);
            setDates(nextDates ?? []);
            setSelectedDate(nextDates?.[0] ?? null);
            const saved = await window.api.get<Task[]>(CHIPS_KEY);
            setChips(saved ?? []);
            setBusy(false);
            if (stats.status === 'ERROR_NETWORK') setMessage('社内LANに接続できません。VPNを起動してから再度試してください');
            else if (stats.status === 'ERROR_LOGIN') setMessage('ログイン情報に誤りがあります。設定を確認してください');
            else setMessage('');
        });
    }, []);

    const sortedProjects = useMemo(() => [...projects].sort((a, b) => rankOf(a.projectName, settings) - rankOf(b.projectName, settings) || a.projectCode.localeCompare(b.projectCode, 'ja')), [projects, settings]);
    const total = tasks.reduce((sum, task) => sum.plus(task.hour), new Decimal(0));

    const addTask = (task: Task) => {
        if (!tasks.some((item) => item.projectCode === task.projectCode && item.processCode === task.processCode)) {
            setTasks((current) => [...current, { ...task, hour: new Decimal(task.hour).toFixed(1) }]);
        }
    };
    const updateTask = (index: number, hour: string) => setTasks((current) => current.map((task, i) => i === index ? { ...task, hour } : task));
    const adjustTask = (index: number) => setTasks((current) => {
        const other = current.reduce((sum, task, i) => i === index ? sum : sum.plus(task.hour), new Decimal(0));
        const remaining = Decimal.max(0, new Decimal(8).minus(other)).toFixed(1);
        return current.map((task, i) => i === index ? { ...task, hour: remaining } : task);
    });

    const saveTask = async () => {
        if (!selectedDate) return window.alert('日付を選択してください');
        setBusy(true);
        const nextChips = [...chips];
        for (const task of tasks) {
            const savedTask = { ...task, hour: new Decimal(task.hour).toFixed(1) };
            await window.api.submitWork({ action: 'submit', date: selectedDate, projectCode: task.projectCode, processCode: task.processCode, hour: savedTask.hour });
            const index = nextChips.findIndex((item) => item.projectCode === task.projectCode && item.processCode === task.processCode);
            if (index < 0) nextChips.push(savedTask);
            else nextChips[index] = savedTask;
        }
        setChips(nextChips);
        await window.api.set(CHIPS_KEY, nextChips);
        setDates((current) => current.filter((date) => date !== selectedDate));
        setSelectedDate(null);
        setTasks([]);
        setBusy(false);
    };

    const saveSettings = async () => {
        const nextOrder = sortOrder.split('\n').filter(Boolean);
        const beforeId = settings?.login_id ?? '';
        const nextSettings = { ...settings, login_id: loginId, project_sort_order: nextOrder } as Settings;
        setSettings(nextSettings);
        setSettingsOpen(false);
        await window.api.submitWork({ action: 'save-sort-order', project_sort_order: nextOrder });
        if (beforeId !== loginId || password) {
            if (window.confirm('再接続しますか？')) await window.api.submitWork({ action: 'init', login_id: loginId, password });
        }
    };

    return <main className={busy ? 'app busy' : 'app'}>
        <header className="header"><div><h1>今日もお疲れさまでした</h1><span>HackNippou / version 2.00</span></div><Button className="icon-button" title="設定" aria-label="設定" onClick={() => setSettingsOpen(true)}><SettingsIcon /></Button></header>
        {message && <div className="message">{message}<Button className="message-close" title="閉じる" aria-label="閉じる" onClick={() => setMessage('')}><Delete /></Button></div>}
        <section className="panel"><h2>未登録日付</h2><div className="date-list">{dates.length ? dates.map((date) => <DateChip key={date} date={date} selected={selectedDate === date} onClick={() => setSelectedDate(date)} />) : <span>未登録の日付はありません</span>}</div></section>
        {chips.length > 0 && <section className="panel"><h2>よく使うタスク</h2><div className="chips">{chips.map((chip) => <TaskChip key={`${chip.projectCode}-${chip.processCode}`} task={chip} color={CHIP_COLORS[rankOf(chip.projectName, settings) % CHIP_COLORS.length]} onClick={() => addTask(chip)} onDelete={async () => { const next = chips.filter((item) => item !== chip); setChips(next); await window.api.set(CHIPS_KEY, next); }} />)}</div></section>}
        <section className="panel task-panel"><h2>登録するタスク</h2>{tasks.map((task, index) => <div className="task-row" key={`${task.projectCode}-${task.processCode}`}><Button className="icon-button" title="削除" aria-label="削除" onClick={() => setTasks((current) => current.filter((_, i) => i !== index))}><Delete /></Button><span>{task.projectName} - {task.processName}</span><Select value={String(task.hour)} onChange={(event) => updateTask(index, event.target.value)}>{Array.from({ length: 17 }, (_, i) => (i / 2).toFixed(1)).map((hour) => <MenuItem key={hour} value={hour}>{hour}</MenuItem>)}</Select><Button className="icon-button" title="残り時間を設定" aria-label="残り時間を設定" onClick={() => adjustTask(index)}><Calculate /></Button></div>)}<Select className="project-select" value="" displayEmpty onChange={(event) => { const [projectCode, processCode] = event.target.value.split('|'); const project = projects.find((item) => item.projectCode === projectCode); const process = project?.processList.find((item) => item.processCode === processCode); if (project && process) addTask({ projectCode, projectName: project.projectName, processCode, processName: process.processName, hour: 0.5 }); }}><MenuItem value="">リストから選択、または、よく使うタスクから選択</MenuItem>{sortedProjects.flatMap((project) => project.processList.map((process) => <MenuItem key={`${project.projectCode}|${process.processCode}`} value={`${project.projectCode}|${process.processCode}`}>{project.projectName} - {process.processName}</MenuItem>))}</Select><div className="total">合計 <strong>{total.toFixed(1)}</strong> 時間</div><Button className="primary" variant="contained" onClick={saveTask} disabled={busy || !tasks.length}>プロジェクト管理システムに登録する</Button></section>
        {settingsOpen && <div className="modal-backdrop"><section className="settings"><Button className="icon-button close" title="閉じる" aria-label="閉じる" onClick={() => setSettingsOpen(false)}><ArrowBack /></Button><label>ログインID<input value={loginId} onChange={(event) => setLoginId(event.target.value)} /></label><label>パスワード<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>プロジェクト並び順<textarea value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} /></label><label className="toggle"><Switch checked={devTool} onChange={async (event) => { setDevTool(event.target.checked); await window.api.submitWork({ action: 'changeDevTool', devTool: event.target.checked }); }} />開発者ツール</label><Button className="primary" variant="contained" onClick={saveSettings}>保存</Button></section></div>}
    </main>;
}

export default App;
