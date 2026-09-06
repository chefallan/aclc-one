'use client';

import React, { useState } from 'react';

const NON_FRACTION_WORDS = new Set(['and/or', 'true/false', 'yes/no', 'w/o', 'either/or', 'n/a', 'c/o', 'km/h', 'm/s', 'mph']);

/**
 * Parses stacked math fractions (e.g. 2/3, (a+b)/(c-d)),
 * superscripts (^2), and subscripts (_i).
 */
export function formatMathString(text: string): (string | React.ReactElement)[] {
  if (!text) return [];

  const fracPattern = /(\b\d+\b|\([^)]+\)|[a-zA-Z0-9^_+]+)\s*\/\s*(\b\d+\b|\([^)]+\)|[a-zA-Z0-9^_+]+)/g;

  const elements: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = fracPattern.exec(text)) !== null) {
    const fullMatch = match[0].trim().toLowerCase();
    
    if (NON_FRACTION_WORDS.has(fullMatch) || fullMatch.includes('http') || fullMatch.includes('//')) {
      continue;
    }

    const precedingChar = match.index > 0 ? text[match.index - 1] : '';
    const followingChar = match.index + match[0].length < text.length ? text[match.index + match[0].length] : '';
    if (precedingChar === '/' || followingChar === '/') {
      continue;
    }

    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      elements.push(...formatSubSup(text.substring(lastIndex, matchIndex), `pre-${keyIdx++}`));
    }

    const rawNum = match[1].replace(/^\((.+)\)$/, '$1').trim();
    const rawDenom = match[2].replace(/^\((.+)\)$/, '$1').trim();

    elements.push(
      <span
        key={`frac-${keyIdx++}`}
        className="inline-flex flex-col text-center align-middle mx-1 text-[0.88em] leading-tight select-text inline-block"
        style={{ verticalAlign: 'middle' }}
      >
        <span className="border-b border-border-strong pb-[1px] px-1 font-semibold text-content leading-none text-center">
          {formatSubSup(rawNum, `num-${keyIdx++}`)}
        </span>
        <span className="pt-[1px] px-1 font-semibold text-content leading-none text-center">
          {formatSubSup(rawDenom, `denom-${keyIdx++}`)}
        </span>
      </span>
    );

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(...formatSubSup(text.substring(lastIndex), `post-${keyIdx++}`));
  }

  return elements;
}

function formatSubSup(text: string, prefix: string): (string | React.ReactElement)[] {
  if (!text) return [];

  const pattern = /(\^|_)(?:\(([^)]+)\)|([a-zA-Z0-9+\-−.]+))/g;
  const elements: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = pattern.exec(text)) !== null) {
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      elements.push(text.substring(lastIndex, matchIndex));
    }

    const operator = match[1];
    const content = match[2] !== undefined ? match[2] : match[3];

    if (operator === '^') {
      elements.push(
        <sup
          key={`${prefix}-sup-${idx++}`}
          className="text-[0.72em] font-semibold text-brand-600 dark:text-brand-400 leading-none ml-[0.5px]"
        >
          {content}
        </sup>
      );
    } else if (operator === '_') {
      elements.push(
        <sub
          key={`${prefix}-sub-${idx++}`}
          className="text-[0.72em] font-semibold text-brand-600 dark:text-brand-400 leading-none ml-[0.5px]"
        >
          {content}
        </sub>
      );
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements;
}

interface MathFormattedTextProps {
  text: string;
  className?: string;
  hideBold?: boolean;
}

export function MaskedClozeText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          setRevealed(false);
        }}
        className="font-bold text-brand-700 dark:text-brand-300 bg-brand-100/80 dark:bg-brand-950/60 px-1 py-0.5 rounded cursor-pointer transition-colors border border-brand-300/40"
        title="Click to hide"
      >
        {formatMathString(text)}
      </span>
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setRevealed(true);
      }}
      className="inline-block px-2 py-0.5 rounded bg-muted text-transparent select-none blur-[5px] hover:blur-none hover:text-content hover:bg-surface-sunk transition-all cursor-pointer font-bold align-baseline mx-0.5 shadow-sm border border-hairline"
      title="Click to reveal keyword"
    >
      <span className="inline-block">{formatMathString(text)}</span>
    </span>
  );
}

export default function MathFormattedText({
  text,
  className = '',
  hideBold = false,
}: MathFormattedTextProps) {
  if (!text) return null;

  const boldPattern = /\*\*([^*]+)\*\*|<b>([^<]+)<\/b>/g;

  if (!boldPattern.test(text)) {
    const formatted = formatMathString(text);
    return <span className={`inline-block ${className}`}>{formatted}</span>;
  }

  boldPattern.lastIndex = 0;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIdx = 0;

  while ((match = boldPattern.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      parts.push(...formatMathString(text.substring(lastIndex, matchIndex)));
    }

    const boldContent = match[1] || match[2];
    if (hideBold) {
      parts.push(<MaskedClozeText key={`masked-${partIdx++}`} text={boldContent} />);
    } else {
      parts.push(
        <strong key={`bold-${partIdx++}`} className="font-bold text-content">
          {formatMathString(boldContent)}
        </strong>
      );
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...formatMathString(text.substring(lastIndex)));
  }

  return <span className={`inline-block ${className}`}>{parts}</span>;
}
