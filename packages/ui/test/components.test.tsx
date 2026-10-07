import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Badge, Button, Calendar, RouteLine, SegmentedControl, StatCard } from '../src';

describe('design system', () => {
  it('Button mostra estado de carregamento e fica desabilitado', () => {
    render(<Button loading>Salvar</Button>);
    const button = screen.getByRole('button', { name: /salvar/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('StatCard e Badge exibem conteúdo', () => {
    render(
      <>
        <StatCard label="Visitas hoje" value={8} />
        <Badge tone="success">Concluída</Badge>
      </>,
    );
    expect(screen.getByText('Visitas hoje')).toBeInTheDocument();
    expect(screen.getByText('Concluída')).toBeInTheDocument();
  });

  it('RouteLine desenha Casa -> paradas -> Casa', () => {
    render(
      <RouteLine
        stops={[
          { id: '1', order: 1, title: 'Drogaria Venancio V47', state: 'done' },
          { id: '2', order: 2, title: 'Drogaria Malibu', state: 'pending' },
        ]}
      />,
    );
    expect(screen.getByText('Saída: Casa')).toBeInTheDocument();
    expect(screen.getByText('Retorno: Casa')).toBeInTheDocument();
    expect(screen.getByText('Drogaria Malibu')).toBeInTheDocument();
  });

  it('SegmentedControl informa a opção marcada', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Visão"
        value="week"
        onChange={onChange}
        options={[
          { value: 'day', label: 'Hoje' },
          { value: 'week', label: 'Semana' },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Semana' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Hoje' }));
    expect(onChange).toHaveBeenCalledWith('day');
  });

  it('Calendar começa a semana na segunda-feira', () => {
    render(<Calendar month="2026-10" today="2026-10-07" />);
    expect(screen.getByRole('gridcell', { name: '2026-09-28' })).toBeInTheDocument();
  });
});

describe('máscaras', () => {
  it('valor em reais com centavos à direita', async () => {
    const { moneyFromInput, moneyToInput } = await import('../src/lib/masks');
    expect(moneyFromInput('470')).toBe(4.7);
    expect(moneyFromInput('R$ 5,00')).toBe(5);
    expect(moneyFromInput('R$ 5,000')).toBe(50);
    expect(moneyFromInput('')).toBeNull();
    expect(moneyToInput(500).replace(/\s/g, ' ')).toBe('R$ 500,00');
    expect(moneyToInput(4.7).replace(/\s/g, ' ')).toBe('R$ 4,70');
  });

  it('CEP, UF, código e coordenadas', async () => {
    const { maskCep, maskUf, maskStoreCode, maskCoordinate } = await import('../src/lib/masks');
    expect(maskCep('20211140')).toBe('20211-140');
    expect(maskUf('rj1')).toBe('RJ');
    expect(maskStoreCode('cri drogaria malibu!')).toBe('CRI-DROGARIA-MALIBU');
    expect(maskCoordinate('-22,97113')).toBe('-22.97113');
    expect(maskCoordinate('-43.18-63')).toBe('-43.1863');
  });

  it('MoneyInput formata enquanto digita', async () => {
    const { MoneyInput } = await import('../src');
    const onValueChange = vi.fn();
    render(<MoneyInput aria-label="Valor" value={null} onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '470' } });
    expect(onValueChange).toHaveBeenCalledWith(4.7);
  });
});
