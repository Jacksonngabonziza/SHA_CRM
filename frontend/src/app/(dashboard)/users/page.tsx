'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { User } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { Users, Loader2, Plus, X, Edit, ShieldCheck, ShieldOff } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const qc = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await authApi.users.list()).data,
  })

  const users: User[] = data?.results ?? data ?? []

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      authApi.users.patch(id, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
    },
    onError: () => toast.error('Failed to update user'),
  })

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <ShieldOff size={48} className="mb-4 text-gray-200" />
        <p className="text-lg font-medium">Admin access required</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} staff accounts</p>
        </div>
        <button onClick={() => { setEditUser(null); setShowForm(true) }} className="btn-primary">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['User', 'Role', 'Phone', 'Joined', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#091928] flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {u.full_name?.[0] || u.username[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{u.full_name || u.username}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('badge', u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
                      {u.role === 'admin' ? <ShieldCheck size={11} className="mr-1" /> : null}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{u.phone || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                      disabled={u.id === currentUser?.id}
                      className={cn(
                        'text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
                        u.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-600 hover:bg-red-200',
                        u.id === currentUser?.id && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => { setEditUser(u); setShowForm(true) }}
                      className="p-1.5 text-gray-400 hover:text-[#091928] hover:bg-gray-100 rounded transition-colors"
                      title="Edit user"
                    >
                      <Edit size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showForm && (
        <UserFormModal
          user={editUser}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['users'] })
            setShowForm(false)
          }}
        />
      )}
    </div>
  )
}

function UserFormModal({
  user, onClose, onSuccess,
}: {
  readonly user: User | null
  readonly onClose: () => void
  readonly onSuccess: () => void
}) {
  const isEdit = !!user
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [role, setRole] = useState<'admin' | 'sales' | 'field_agent'>(
    (user?.role === 'field_agent' ? 'sales' : user?.role) ?? 'sales'
  )
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      isEdit ? authApi.users.patch(user!.id, d) : authApi.users.create(d),
    onSuccess: () => {
      onSuccess()
      toast.success(isEdit ? 'User updated' : 'User created')
    },
    onError: () => toast.error(isEdit ? 'Failed to update user' : 'Failed to create user'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      username, email, first_name: firstName, last_name: lastName, phone, role,
    }
    if (!isEdit || password) payload.password = password
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit User' : 'Add User'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-firstname" className="label">First Name</label>
              <input id="user-firstname" value={firstName} onChange={e => setFirstName(e.target.value)} className="input" required />
            </div>
            <div>
              <label htmlFor="user-lastname" className="label">Last Name</label>
              <input id="user-lastname" value={lastName} onChange={e => setLastName(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="user-username" className="label">Username</label>
            <input id="user-username" value={username} onChange={e => setUsername(e.target.value)} className="input" required />
          </div>
          <div>
            <label htmlFor="user-email" className="label">Email</label>
            <input id="user-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="user-phone" className="label">Phone</label>
            <input id="user-phone" value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+250 7xx xxx xxx" />
          </div>
          <div>
            <label htmlFor="user-role" className="label">Role</label>
            <select id="user-role" value={role} onChange={e => setRole(e.target.value as 'admin' | 'sales')} className="input">
              <option value="sales">Sales</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="user-password" className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input id="user-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required={!isEdit} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
