// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// import { redirect } from 'next/navigation';
// import { AdminProvider } from '@/providers/admin-provider';

// export default async function AdminLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <AdminProvider>
//       <div className="min-h-screen bg-gray-50">
//         {children}
//       </div>
//     </AdminProvider>
//   );
// }

// app/admin/layout.tsx (temporary debug)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // <AdminProvider>   <-- comment out for test
      <div className="min-h-screen bg-gray-50">{children}</div>
    // </AdminProvider>
  );
}

