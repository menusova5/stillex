import React from 'react';
import { BatchItem } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface BatchListProps {
  items: BatchItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}

export const BatchList: React.FC<BatchListProps> = ({ items, selectedId, onSelect, onClear }) => {
  const { t } = useTranslation();
  if (items.length <= 1) return null;

  return (
    <div className="border border-zinc-800 bg-black p-3 font-mono text-xs space-y-2">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
        <span className="text-zinc-500 font-bold">
          // BATCH_QUEUE: [{items.length}_ITEMS]
        </span>
        <button
          onClick={onClear}
          className="text-zinc-600 hover:text-white transition-colors cursor-pointer text-[10px]"
        >
          [ PURGE_QUEUE ]
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
        {items.map((item, idx) => {
          const isSelected = item.id === selectedId;
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`p-2 border transition-colors cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'border-white bg-white text-black font-bold'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
              }`}
            >
              <div className="truncate mr-2">
                <span className="text-[10px] opacity-60 mr-1">0{idx + 1}.</span>
                <span className="truncate">{item.file.name}</span>
              </div>

              <div className="text-[10px] shrink-0 font-mono">
                {item.status === 'completed' && '[OK]'}
                {item.status === 'extracting' && '[RUN]'}
                {item.status === 'analyzing' && '[PRB]'}
                {item.status === 'ready' && '[RDY]'}
                {item.status === 'queued' && '[Q]'}
                {item.status === 'error' && '[ERR]'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
