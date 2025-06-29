import { useState, KeyboardEvent } from "react";

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
}

export default function TagInput({ tags, setTags }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setInputValue("");
    }
  };
  
  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    }
  };
  
  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] focus-within:ring-2 focus-within:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus-within:ring-primary/60 transition-colors duration-200">
      {tags.map((tag, index) => (
        <span 
          key={index} 
          className="bg-primary-light text-primary-dark dark:bg-primary/20 dark:text-pink-300 text-xs px-2 py-1 rounded-full flex items-center transition-all duration-200 hover:bg-primary/20 dark:hover:bg-primary/30 dark:hover:shadow-glow-xs"
        >
          {tag}
          <button 
            type="button"
            className="ml-1"
            onClick={() => removeTag(index)}
          >
            <span className="material-icons text-xs">close</span>
          </button>
        </span>
      ))}
      <input 
        type="text" 
        placeholder="Adicionar tag..." 
        className="border-none outline-none flex-grow text-sm min-w-[120px] bg-transparent dark:text-gray-100 dark:placeholder-gray-400 transition-colors duration-200"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => inputValue && addTag(inputValue)}
      />
    </div>
  );
}
