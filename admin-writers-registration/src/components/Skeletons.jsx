export function MetricSkeleton() {
    return (
        <div className="bg-white p-3 sm:p-5 rounded-md shadow-sm border border-zinc-200 flex items-center justify-between animate-pulse">
            <div className="space-y-3 w-full">
                <div className="h-2 sm:h-3 bg-zinc-200 rounded w-24"></div>
                <div className="h-6 sm:h-8 bg-zinc-200 rounded w-16"></div>
            </div>
            <div className="p-4 sm:p-5 bg-zinc-100 rounded border border-zinc-50 ml-4">
            </div>
        </div>
    );
}

export function ListSkeleton({ count = 3 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-zinc-50 rounded border border-zinc-100 animate-pulse">
                    <div className="space-y-2 w-1/2">
                        <div className="h-3 sm:h-4 bg-zinc-200 rounded w-3/4"></div>
                        <div className="h-2 bg-zinc-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                        <div className="h-4 bg-zinc-200 rounded w-12"></div>
                        <div className="h-2 bg-zinc-200 rounded w-16"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function TableSkeleton({ rowCount = 5, colCount = 5 }) {
    return (
        <div className="overflow-x-auto w-full animate-pulse border border-zinc-200 rounded-md">
            <table className="w-full min-w-[750px] border-collapse bg-white">
                <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-200">
                        {Array.from({ length: colCount }).map((_, i) => (
                            <th key={i} className="border-r border-zinc-200 last:border-r-0 py-3 px-3">
                                <div className="h-3 bg-zinc-200 rounded w-20"></div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rowCount }).map((_, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-zinc-100 last:border-b-0">
                            {Array.from({ length: colCount }).map((_, colIndex) => (
                                <td key={colIndex} className="border-r border-zinc-100 last:border-r-0 py-4 px-3">
                                    <div className={`h-3 bg-zinc-100 rounded ${colIndex === 0 ? 'w-32' : colIndex === colCount - 1 ? 'w-16' : 'w-24'}`}></div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
