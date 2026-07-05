"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { getCategoryTheme, type CategoryTheme } from "@/lib/categoryTheme";

interface CategoryContextValue {
  category: string;
  theme: CategoryTheme;
  setCategory: (cat: string) => void;
}

const CategoryContext = createContext<CategoryContextValue | null>(null);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [category, setCategoryState] = useState("restaurant");

  const setCategory = useCallback((cat: string) => {
    setCategoryState(cat);
  }, []);

  const theme = getCategoryTheme(category);

  return (
    <CategoryContext.Provider value={{ category, theme, setCategory }}>
      {children}
    </CategoryContext.Provider>
  );
}

/**
 * Hook to access the current category and resolved theme.
 * Must be used within a <CategoryProvider>.
 */
export function useCategoryTheme(): CategoryContextValue {
  const ctx = useContext(CategoryContext);
  if (!ctx) {
    throw new Error("useCategoryTheme must be used within a <CategoryProvider>");
  }
  return ctx;
}
