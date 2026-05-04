"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Trophy, Camera, Wallet, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { label: 'Início', icon: LayoutDashboard, href: '/' },
  { label: 'Sorteio', icon: Users, href: '/sorteio' },
  { label: 'Ranking', icon: Trophy, href: '/ranking' },
  { label: 'Lances', icon: Camera, href: '/lances' },
  { label: 'Pagar', icon: Wallet, href: '/pagamento' },
  { label: 'Amigos', icon: UserPlus, href: '/amigos' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={clsx('nav-item', isActive && 'active')}
          >
            <Icon strokeWidth={isActive ? 2.5 : 2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
