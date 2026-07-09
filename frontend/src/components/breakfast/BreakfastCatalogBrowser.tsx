/**
 * BreakfastCatalogBrowser.tsx
 * Comprehensive list view of all breakfast items with filtering and searching.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BreakfastCatalog, BaseIngredient, ToppingIngredient, ExtraIngredient, Recipe } from '../../schemas/breakfast';
import { ApiClient } from '../../services/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ErrorDisplay';
import { BreakfastItemCard } from './BreakfastItemCard';

type ItemType = 'base' | 'topping' | 'fat' | 'extra' | 'drink' | 'warm';

interface BreakfastCatalogBrowserProps {
  groupId?: number;
  onItemSelect?: (item: any, type: ItemType | 'recipe') => void;
}

export function BreakfastCatalogBrowser({
  groupId,
  onItemSelect,
}: BreakfastCatalogBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ItemType | 'recipe' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch breakfast catalog
  const { data: catalog, isLoading, error } = useQuery({
    queryKey: ['breakfast-catalog-browser', groupId],
    queryFn: async () => {
      const params = groupId ? `?group_id=${groupId}` : '';
      const response = await ApiClient.get(`/api/supply/breakfast-catalog/${params}`);
      return response.data as BreakfastCatalog;
    },
  });

  const itemTypes: Array<{ key: ItemType; label: string }> = [
    { key: 'base', label: 'Basis' },
    { key: 'topping', label: 'Belag' },
    { key: 'fat', label: 'Streichfett' },
    { key: 'extra', label: 'Extras' },
    { key: 'drink', label: 'Getränke' },
    { key: 'warm', label: 'Warm' },
  ];

  // Flatten and filter all items
  const allItems = useMemo(() => {
    if (!catalog) return [];

    const items: Array<{
      item: any;
      type: ItemType | 'recipe';
      name: string;
      description?: string;
      owner_name?: string;
    }> = [];

    // Add ingredients
    const addIngredients = (
      list: any[],
      type: ItemType
    ) => {
      list?.forEach((item) => {
        items.push({
          item,
          type,
          name: item.name,
          description: item.description,
          owner_name: item.owner_name,
        });
      });
    };

    addIngredients(catalog.base_ingredients || [], 'base');
    addIngredients(catalog.topping_ingredients || [], 'topping');
    addIngredients(catalog.fat_ingredients || [], 'fat');
    addIngredients(catalog.extra_ingredients || [], 'extra');
    addIngredients(catalog.drink_ingredients || [], 'drink');
    addIngredients(catalog.warm_meal_recipes || [], 'warm');

    // Add recipes
    catalog.recipes?.forEach((recipe) => {
      items.push({
        item: recipe,
        type: 'recipe',
        name: recipe.title,
        description: recipe.description,
        owner_name: recipe.owner_name,
      });
    });

    return items;
  }, [catalog]);

  // Filter items based on search and type
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesType =
        selectedType === 'all' || item.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [allItems, searchQuery, selectedType]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error as Error} />;

  const ContainerClass = viewMode === 'grid'
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'space-y-3';

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Frühstücks-Katalog</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              title="Grid-Ansicht"
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              title="Listen-Ansicht"
            >
              ≡
            </button>
          </div>
        </div>

        {/* Search */}
        <Input
          type="text"
          placeholder="Zutat oder Rezept durchsuchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />

        {/* Type Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Alle ({allItems.length})
          </button>
          {itemTypes.map((type) => {
            const count = allItems.filter((i) => i.type === type.key).length;
            return (
              <button
                key={type.key}
                onClick={() => setSelectedType(type.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedType === type.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {type.label} ({count})
              </button>
            );
          })}
          <button
            onClick={() => setSelectedType('recipe')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedType === 'recipe'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Rezepte ({allItems.filter((i) => i.type === 'recipe').length})
          </button>
        </div>
      </div>

      {/* Results */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">
            {searchQuery
              ? 'Keine Ergebnisse für deine Suche'
              : 'Keine Einträge in dieser Kategorie'}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-4"
            >
              Suche löschen
            </Button>
          )}
        </div>
      ) : (
        <div className={ContainerClass}>
          {filteredItems.map((item) => (
            <div
              key={`${item.type}-${item.item.id || item.item.slug}`}
              onClick={() => onItemSelect?.(item.item, item.type)}
              className="cursor-pointer"
            >
              <BreakfastItemCard
                item={item.item}
                type={item.type === 'recipe' ? 'recipe' : 'ingredient'}
                onView={() => onItemSelect?.(item.item, item.type)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-gray-600 pt-4 border-t">
        Zeige {filteredItems.length} von {allItems.length} Einträgen
      </div>
    </div>
  );
}
