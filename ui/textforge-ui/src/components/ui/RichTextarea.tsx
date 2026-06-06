import { useEffect, useLayoutEffect, useRef } from 'react';

interface RichTextareaProps {
  value: string | null;
  onChange: (html: string | null) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
}

export function RichTextarea({ value, onChange, placeholder, className = '', minRows = 3 }: RichTextareaProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  // Set initial content once per mount
  useLayoutEffect(() => {
    if (initializedRef.current || !divRef.current) return;
    initializedRef.current = true;
    divRef.current.innerHTML = value ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInput() {
    const el = divRef.current;
    if (!el) return;
    const isEmpty = el.textContent?.trim() === '' && !el.querySelector('a.tf-link');
    onChangeRef.current(isEmpty ? null : el.innerHTML);
  }

  const minHeight = `${minRows * 1.6}em`;

  return (
    <div className={`richtextarea-wrap ${className}`} style={{ minHeight }}>
      {!value && (
        <div className="richtextarea-placeholder" aria-hidden>
          {placeholder}
        </div>
      )}
      <div
        ref={divRef}
        className="richtextarea"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onInput={handleInput}
      />
    </div>
  );
}
