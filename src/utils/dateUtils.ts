/**
 * 格式化日期
 * @param date 日期对象或时间戳
 * @param format 格式字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | number | undefined, format: string = 'yyyy-MM-dd'): string {
    if (date === undefined) {
        return '-';
    }

    const d = typeof date === 'number' ? new Date(date) : date;

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();

    const padZero = (num: number): string => {
        return num < 10 ? `0${num}` : `${num}`;
    };

    return format
        .replace(/yyyy/g, `${year}`)
        .replace(/MM/g, padZero(month))
        .replace(/dd/g, padZero(day))
        .replace(/HH/g, padZero(hours))
        .replace(/mm/g, padZero(minutes))
        .replace(/ss/g, padZero(seconds));
}