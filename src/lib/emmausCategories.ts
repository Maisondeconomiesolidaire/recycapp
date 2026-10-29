import { useEffect, useState } from "react";

export type EmmausCategory = {
  path: string[];
  label: string;
};

const HIDDEN_ROOT_CATEGORIES = new Set([
  "Mode",
  "Fait main",
  "Cartes cadeaux",
  "Bons plans",
]);

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += char;
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ";" && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

export function parseEmmausCategories(csv: string): EmmausCategory[] {
  return csv
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map(parseCsvLine)
    .map((cells) => ({
      path: cells.slice(2, 6).filter(Boolean),
      label: cells[6],
    }))
    .filter((category) => category.path.length > 0);
}

export function childCategories(categories: EmmausCategory[], path: string[]) {
  const level = path.length;
  return Array.from(
    new Set(
      categories
        .filter((category) =>
          category.path.length > level &&
          !(level === 0 && HIDDEN_ROOT_CATEGORIES.has(category.path[0])) &&
          path.every((part, index) => category.path[index] === part),
        )
        .map((category) => category.path[level]),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

export function useEmmausCategories() {
  const [categories, setCategories] = useState<EmmausCategory[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/categories-label-emmaus.csv")
      .then((response) => response.text())
      .then((csv) => {
        if (active) setCategories(parseEmmausCategories(csv));
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return categories;
}
