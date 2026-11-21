import React, { useState } from 'react';
import { Plus, Star, UserCheck, UserX } from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import { ASSET_URLS } from '../../data/seedData';
import type { DealershipRole, Employee } from '../../types/domain';
import { SafeImage } from '../../components/SafeImage';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export const EmployeesPage: React.FC = () => {
  const { employees, addEmployee, updateEmployee, toggleEmployeeActive } = useService();

  const [roleFilter, setRoleFilter] = useState<'all' | DealershipRole>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Employee | null>(null);

  const [employeeCode, setEmployeeCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<DealershipRole>('technician');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Service Operations');
  const [skillsText, setSkillsText] = useState('');
  const [availability, setAvailability] = useState<Employee['availability']>('available');
  const [formError, setFormError] = useState('');

  const filtered = employees.filter((e) => (roleFilter === 'all' ? true : e.role === roleFilter));

  const openCreateForm = () => {
    setEditingId(null);
    setEmployeeCode(`EMP-${Math.floor(400 + Math.random() * 500)}`);
    setName('');
    setEmail('');
    setPhone('');
    setRole('technician');
    setDesignation('');
    setDepartment('Powertrain & Diagnostics');
    setSkillsText('OBD-II Diagnostics, Brake Service');
    setAvailability('available');
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (emp: Employee) => {
    setEditingId(emp.id);
    setEmployeeCode(emp.employeeCode);
    setName(emp.name);
    setEmail(emp.email);
    setPhone(emp.phone);
    setRole(emp.role);
    setDesignation(emp.designation);
    setDepartment(emp.department);
    setSkillsText(emp.skills.join(', '));
    setAvailability(emp.availability);
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim() || !email.trim() || !phone.trim() || !designation.trim()) {
      setFormError('Name, email, phone, and designation are required.');
      return;
    }

    const skills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);

    if (editingId) {
      await updateEmployee(editingId, {
        employeeCode: employeeCode.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        designation: designation.trim(),
        department: department.trim(),
        skills,
        availability,
      });
    } else {
      await addEmployee({
        employeeCode: employeeCode.trim() || `EMP-${Date.now().toString().slice(-3)}`,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        designation: designation.trim(),
        department: department.trim(),
        avatarUrl: role === 'technician' ? ASSET_URLS.avatarArjun : ASSET_URLS.avatarPriya,
        skills,
        availability,
        isActive: true,
      });
    }
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A1628]">Employee Management</h2>
          <p className="text-sm text-slate-600 mt-1">
            Admin-controlled staff directory, role permissions, skill specialization, and bay performance tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Register Employee
        </button>
      </div>

      {/* Role Filter Bar */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {(['all', 'admin', 'advisor', 'technician', 'parts_manager'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
              roleFilter === r ? 'bg-white text-[#0A1628] shadow-xs' : 'text-slate-600 hover:text-[#0A1628]'
            }`}
          >
            {r.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Add / Edit Employee Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          noValidate
        >
          <h3 className="text-base font-bold text-[#0A1628]">
            {editingId ? 'Edit Employee Profile' : 'Register New Dealership Employee'}
          </h3>
          {formError && (
            <div className="px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="emp-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="emp-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label htmlFor="emp-code" className="block text-xs font-semibold text-slate-700 mb-1">
                Employee ID
              </label>
              <input
                id="emp-code"
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="emp-role" className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Role
              </label>
              <select
                id="emp-role"
                value={role}
                onChange={(e) => setRole(e.target.value as DealershipRole)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="admin">Admin</option>
                <option value="advisor">Service Advisor</option>
                <option value="technician">Technician</option>
                <option value="parts_manager">Parts Manager</option>
              </select>
            </div>
            <div>
              <label htmlFor="emp-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email
              </label>
              <input
                id="emp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label htmlFor="emp-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone
              </label>
              <input
                id="emp-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label htmlFor="emp-availability" className="block text-xs font-semibold text-slate-700 mb-1">
                Availability
              </label>
              <select
                id="emp-availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value as Employee['availability'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="off_duty">Off Duty</option>
              </select>
            </div>
            <div>
              <label htmlFor="emp-designation" className="block text-xs font-semibold text-slate-700 mb-1">
                Designation
              </label>
              <input
                id="emp-designation"
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Master EV Technician"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label htmlFor="emp-dept" className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <input
                id="emp-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label htmlFor="emp-skills" className="block text-xs font-semibold text-slate-700 mb-1">
                Skills (comma-separated)
              </label>
              <input
                id="emp-skills"
                type="text"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8]"
            >
              {editingId ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      )}

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((emp) => (
          <div
            key={emp.id}
            className={`bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between ${
              !emp.isActive ? 'opacity-65' : ''
            }`}
          >
            <div>
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <SafeImage src={emp.avatarUrl} alt={emp.name} fallbackLabel={emp.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#0A1628] truncate">{emp.name}</h3>
                    <span className="text-xs font-mono-tabular text-slate-400">{emp.employeeCode}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{emp.designation}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                    {emp.role.replace('_', ' ')} · {emp.department}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <p>{emp.email}</p>
                <p>{emp.phone}</p>
                <p className="text-slate-500 pt-1">Skills: {emp.skills.join(' · ') || 'General'}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs font-mono-tabular">
                <span className="inline-flex items-center gap-1 font-semibold text-[#0A1628]">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {emp.averageRating.toFixed(1)}
                </span>
                <span className="text-slate-500">{emp.completedJobs} done</span>
                <span className="text-slate-500 capitalize">{emp.availability.replace('_', ' ')}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditForm(emp)}
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmToggle(emp)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#0A1628]"
                >
                  {emp.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  {emp.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(confirmToggle)}
        title={confirmToggle?.isActive ? 'Deactivate Employee Account' : 'Reactivate Employee Account'}
        description={
          confirmToggle
            ? `Are you sure you want to ${confirmToggle.isActive ? 'deactivate' : 'reactivate'} ${confirmToggle.name} (${confirmToggle.employeeCode})?`
            : ''
        }
        confirmLabel={confirmToggle?.isActive ? 'Deactivate' : 'Reactivate'}
        variant={confirmToggle?.isActive ? 'danger' : 'primary'}
        onConfirm={async () => {
          if (confirmToggle) await toggleEmployeeActive(confirmToggle.id);
          setConfirmToggle(null);
        }}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
};
