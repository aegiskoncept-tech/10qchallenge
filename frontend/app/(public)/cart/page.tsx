'use client';
import React, { useState, useEffect } from 'react';
import Cart from '@/src/views/Cart';
import { coursesData, getStoredCourses } from '@/src/data/courses';

export default function CartPage() {
  const [items, setItems] = useState<any[]>(() => {
    const stored = getStoredCourses();
    const source = stored.length > 0 ? stored : coursesData;
    return source.slice(0, 1);
  });

  const handleRemove = (id: number) => {
    setItems((prev) => prev.filter((item: any) => item.id !== id));
  };

  // @ts-ignore
  return <Cart cartItems={items} onRemoveItem={handleRemove} />;
}
