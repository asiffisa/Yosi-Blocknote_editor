"use client";

export function Editor() {
    return (
        <div className="w-full h-full">
            <textarea
                placeholder="Type here..."
                className="w-full h-full p-4 outline-none resize-none bg-transparent"
            />
        </div>
    );
}
