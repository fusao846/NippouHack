import Chip from '@mui/material/Chip';

type DateChipProps = {
    date: string;
    selected: boolean;
    onClick: () => void;
};

function DateChip({ date, selected, onClick }: DateChipProps) {
    return <Chip
        label={date.slice(5)}
        color={selected ? 'primary' : 'default'}
        variant={selected ? 'filled' : 'outlined'}
        onClick={onClick}
        sx={{ fontSize: 16 }}
    />;
}

export default DateChip;