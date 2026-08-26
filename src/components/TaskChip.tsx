import Chip from '@mui/material/Chip';
import Delete from '@mui/icons-material/Delete';
import type { Task } from '../electron';

type TaskChipProps = {
    task: Task;
    color: string;
    onClick: () => void;
    onDelete: () => void;
};

function TaskChip({ task, color, onClick, onDelete }: TaskChipProps) {
    return <Chip
        label={<><span>{task.projectName} - {task.processName}</span><b>{task.hour}</b></>}
        onClick={onClick}
        onDelete={onDelete}
        deleteIcon={<Delete />}
        sx={{
            backgroundColor: color,
            '& b': { marginLeft: 1, color: '#b33d39', fontSize: 18 },
        }}
    />;
}

export default TaskChip;