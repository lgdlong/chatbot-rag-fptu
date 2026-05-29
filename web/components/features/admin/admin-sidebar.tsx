'use client';

import { NavLink, Stack, Text } from '@mantine/core';
import {
  IconLayoutDashboard,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';

export type AdminSection = 'overview' | 'approvals' | 'provisioning' | 'accounts';

const items: Array<{
  key: AdminSection;
  label: string;
  description: string;
  icon: typeof IconLayoutDashboard;
}> = [
  {
    key: 'overview',
    label: 'Tổng quan',
    description: 'Giám sát nhanh hệ thống',
    icon: IconLayoutDashboard,
  },
  {
    key: 'approvals',
    label: 'Duyệt giảng viên',
    description: 'Xử lý yêu cầu đăng ký',
    icon: IconUserCheck,
  },
  {
    key: 'provisioning',
    label: 'Cấp phát tài khoản',
    description: 'Tạo nhanh tài khoản thủ công',
    icon: IconUserPlus,
  },
  {
    key: 'accounts',
    label: 'Quản lý account',
    description: 'Danh sách, tìm kiếm và khóa user',
    icon: IconUsers,
  },
];

interface AdminSidebarProps {
  activeSection: AdminSection;
  onChange: (section: AdminSection) => void;
}

export function AdminSidebar({ activeSection, onChange }: AdminSidebarProps) {
  return (
    <Stack gap="xs">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.key}
            active={activeSection === item.key}
            onClick={() => onChange(item.key)}
            label={item.label}
            description={<Text size="xs">{item.description}</Text>}
            leftSection={<Icon size={18} />}
            variant="filled"
            color="indigo"
            styles={{
              root: {
                border: '1px solid #27272a',
                backgroundColor: activeSection === item.key ? '#312e81' : '#111113',
              },
              label: {
                color: '#f4f4f5',
                fontWeight: 600,
              },
              description: {
                color: '#a1a1aa',
              },
            }}
          />
        );
      })}
    </Stack>
  );
}
