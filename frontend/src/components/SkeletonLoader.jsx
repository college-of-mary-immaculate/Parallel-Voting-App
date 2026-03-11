import React from 'react';

// Election Card Skeleton
export const ElectionCardSkeleton = () => (
  <div className="bg-white shadow rounded-lg overflow-hidden animate-pulse">
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
      
      {/* Title */}
      <div className="h-6 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      
      {/* Description */}
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
      </div>
      
      {/* Meta Info */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
      
      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
      
      {/* Buttons */}
      <div className="space-y-2">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

// Search Bar Skeleton
export const SearchBarSkeleton = () => (
  <div className="animate-pulse">
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <div className="h-5 w-5 bg-gray-200 rounded"></div>
      </div>
      <div className="block w-full pl-10 pr-3 py-3 bg-gray-200 rounded-md"></div>
    </div>
  </div>
);

// Filter Dropdown Skeleton
export const FilterDropdownSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-5 bg-gray-200 rounded mb-2 w-16"></div>
    <div className="h-10 bg-gray-200 rounded"></div>
  </div>
);

// Results Summary Skeleton
export const ResultsSummarySkeleton = () => (
  <div className="flex items-center justify-between animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-48"></div>
    <div className="flex space-x-2">
      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
    </div>
  </div>
);

// Profile Card Skeleton
export const ProfileCardSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    {/* Header */}
    <div className="flex items-center space-x-4 mb-6">
      <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded mb-2 w-32"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
    
    {/* Info Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
    </div>
    
    {/* Button */}
    <div className="h-10 bg-gray-200 rounded"></div>
  </div>
);

// Voting History Skeleton
export const VotingHistorySkeleton = () => (
  <div className="bg-white shadow rounded-lg overflow-hidden animate-pulse">
    <div className="p-6">
      {/* Header */}
      <div className="h-6 bg-gray-200 rounded mb-4 w-32"></div>
      
      {/* History Items */}
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded mb-2 w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Settings Form Skeleton
export const SettingsFormSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    {/* Header */}
    <div className="h-6 bg-gray-200 rounded mb-6 w-32"></div>
    
    {/* Form Fields */}
    <div className="space-y-4">
      <div>
        <div className="h-4 bg-gray-200 rounded mb-2 w-24"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded mb-2 w-32"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded mb-2 w-20"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    </div>
    
    {/* Button */}
    <div className="mt-6 h-10 bg-gray-200 rounded w-32"></div>
  </div>
);

// Stats Card Skeleton
export const StatsCardSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="flex items-center">
      <div className="h-12 w-12 bg-gray-200 rounded-lg mr-4"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded mb-2 w-16"></div>
        <div className="h-8 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  </div>
);

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="bg-white shadow rounded-lg overflow-hidden animate-pulse">
    <div className="p-6">
      {/* Header */}
      <div className="h-6 bg-gray-200 rounded mb-4 w-32"></div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// List Skeleton
export const ListSkeleton = ({ items = 5 }) => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded mb-2 w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    ))}
  </div>
);

// Grid Skeleton Loader
export const GridSkeleton = ({ items = 6, cols = 3 }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-4 sm:gap-6`}>
    {Array.from({ length: items }).map((_, index) => (
      <ElectionCardSkeleton key={index} />
    ))}
  </div>
);

// Full Page Skeleton
export const FullPageSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-64"></div>
        </div>
        
        {/* Content Skeleton */}
        <div className="space-y-6">
          {/* Search Bar */}
          <SearchBarSkeleton />
          
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FilterDropdownSkeleton />
              <FilterDropdownSkeleton />
              <FilterDropdownSkeleton />
              <FilterDropdownSkeleton />
            </div>
          </div>
          
          {/* Results Summary */}
          <ResultsSummarySkeleton />
          
          {/* Grid Content */}
          <GridSkeleton />
        </div>
      </div>
    </div>
  </div>
);

export default {
  ElectionCardSkeleton,
  SearchBarSkeleton,
  FilterDropdownSkeleton,
  ResultsSummarySkeleton,
  ProfileCardSkeleton,
  VotingHistorySkeleton,
  SettingsFormSkeleton,
  StatsCardSkeleton,
  TableSkeleton,
  ListSkeleton,
  GridSkeleton,
  FullPageSkeleton
};
