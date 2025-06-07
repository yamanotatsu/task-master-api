"use client"

import React from 'react'
import { Toaster } from 'sonner'

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          },
          className: 'font-sans',
          error: {
            style: {
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b'
            }
          },
          success: {
            style: {
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534'
            }
          },
          warning: {
            style: {
              background: '#fefce8',
              border: '1px solid #fef08a',
              color: '#854d0e'
            }
          }
        }}
      />
    </>
  )
}