'use client';

import { useState } from 'react';
import Image from 'next/image';
import { zeliumBrand } from '../lib/brand';

export default function ZeliumBrand({ logoSrc = zeliumBrand.logoSrc }: { logoSrc?: string | null }) {
  const [falhou, setFalhou] = useState(false);
  return logoSrc && !falhou
    ? <Image src={logoSrc} alt={zeliumBrand.nome} width={148} height={44} unoptimized className="h-11 w-auto max-w-full object-contain" onError={() => setFalhou(true)} />
    : <span className="font-bold tracking-tight">{zeliumBrand.nome}</span>;
}
