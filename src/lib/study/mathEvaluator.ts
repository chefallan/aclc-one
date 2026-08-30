function sanitizeMathExpression(raw: string): string {
  let expr = raw.trim();
  expr = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'Math.PI')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/√\s*(\d+(\.\d+)?)/g, 'Math.sqrt($1)')
    .replace(/√\s*\(([^)]+)\)/g, 'Math.sqrt($1)')
    .replace(/\bsqrt\s*\(/gi, 'Math.sqrt(')
    .replace(/\babs\s*\(/gi, 'Math.abs(')
    .replace(/\bsin\s*\(/gi, 'Math.sin(')
    .replace(/\bcos\s*\(/gi, 'Math.cos(')
    .replace(/\btan\s*\(/gi, 'Math.tan(')
    .replace(/\blog\s*\(/gi, 'Math.log10(')
    .replace(/\bln\s*\(/gi, 'Math.log(');

  expr = expr.replace(/\^/g, '**');
  return expr;
}

export function evaluateMathExpression(raw: string): number | null {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim().replace(/^["']|["']$/g, '');
  cleaned = cleaned.replace(/^[a-zA-Z]\s*=\s*/, '');
  cleaned = cleaned.replace(/^(evaluate|calculate|solve|ans|answer)\s*:?\s*/i, '');

  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }

  const fracMatch = cleaned.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const denom = parseFloat(fracMatch[2]);
    if (denom !== 0) {
      return parseFloat(fracMatch[1]) / denom;
    }
  }

  const pctMatch = cleaned.match(/^(-?\d+(\.\d+)?)\s*%$/);
  if (pctMatch) {
    return parseFloat(pctMatch[1]) / 100;
  }

  try {
    const sanitized = sanitizeMathExpression(cleaned);
    const testSanitized = sanitized.replace(/Math\.(PI|E|sqrt|abs|sin|cos|tan|log10|log)/g, '');
    if (!/^[\d\s+\-*/%(),.**eE]+$/.test(testSanitized)) {
      return null;
    }

    const fn = new Function('"use strict"; return (' + sanitized + ');');
    const result = fn();

    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

export function solveLinearEquation(raw: string): number | null {
  if (!raw || !raw.includes('=')) return null;

  const parts = raw.split('=');
  if (parts.length !== 2) return null;

  const leftStr = parts[0].trim();
  const rightStr = parts[1].trim();

  const leftNum = evaluateMathExpression(leftStr);
  const rightNum = evaluateMathExpression(rightStr);

  if (leftNum !== null && /^[a-zA-Z]$/.test(rightStr)) {
    return leftNum;
  }
  if (rightNum !== null && /^[a-zA-Z]$/.test(leftStr)) {
    return rightNum;
  }

  const varMatch = raw.match(/([a-zA-Z])/);
  if (!varMatch) return null;
  const variable = varMatch[1];

  try {
    const leftExpr = leftStr
      .replace(new RegExp('(\\d)(' + variable + ')', 'g'), '$1*$2')
      .replace(new RegExp(variable, 'g'), 'x');
    const rightExpr = rightStr
      .replace(new RegExp('(\\d)(' + variable + ')', 'g'), '$1*$2')
      .replace(new RegExp(variable, 'g'), 'x');

    const sanitizedLeft = sanitizeMathExpression(leftExpr);
    const sanitizedRight = sanitizeMathExpression(rightExpr);

    const f = (xVal: number) => {
      const fn = new Function('x', '"use strict"; return (' + sanitizedLeft + ') - (' + sanitizedRight + ');');
      return fn(xVal);
    };

    const y0 = f(0);
    const y1 = f(1);
    const slope = y1 - y0;

    if (Math.abs(slope) > 1e-9) {
      const root = -y0 / slope;
      if (Math.abs(f(root)) < 1e-6) {
        return root;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function areMathExpressionsEquivalent(input: string, expected: string): boolean {
  if (!input || !expected) return false;

  const cleanInput = input.trim().toLowerCase();
  const cleanExpected = expected.trim().toLowerCase();

  if (cleanInput === cleanExpected) return true;

  const stripParens = (s: string) => s.replace(/^\((.+)\)$/, '$1').trim();
  if (stripParens(cleanInput) === stripParens(cleanExpected)) return true;

  const v1 = evaluateMathExpression(cleanInput);
  const v2 = evaluateMathExpression(cleanExpected);

  if (v1 !== null && v2 !== null) {
    if (Math.abs(v1 - v2) < 1e-5) {
      return true;
    }
  }

  if (cleanExpected.includes('=')) {
    const eqSolution = solveLinearEquation(cleanExpected);
    if (eqSolution !== null) {
      if (v1 !== null && Math.abs(v1 - eqSolution) < 1e-5) return true;
    }
  }

  if (cleanInput.includes('=')) {
    const eqSolution = solveLinearEquation(cleanInput);
    if (eqSolution !== null) {
      if (v2 !== null && Math.abs(v2 - eqSolution) < 1e-5) return true;
    }
  }

  return false;
}
