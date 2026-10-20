import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CheckList, KeyButtons, ListFilter, SegmentControl, SelectField } from './SidebarControls';

const BRANDS = [
  { value: 'own', label: 'Eigenmarke' },
  { value: 'third', label: 'Fremdmarke' },
] as const;

describe('ListFilter', () => {
  it('marks the selected entry and reports a new choice', async () => {
    const onChange = vi.fn();
    render(
      <ListFilter
        label="Queue-Typ"
        value="all"
        onChange={onChange}
        options={[
          { value: 'all', label: 'Alle offenen', count: 1234 },
          { value: 'order', label: 'Bestellen' },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: /Alle offenen/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('1.234')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Bestellen' }));
    expect(onChange).toHaveBeenCalledWith('order');
  });
});

describe('SegmentControl', () => {
  it('is a labelled radio group', async () => {
    const onChange = vi.fn();
    render(<SegmentControl label="Marke" value="own" onChange={onChange} options={[...BRANDS]} />);
    expect(screen.getByRole('radiogroup', { name: 'Marke' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Eigenmarke' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Fremdmarke' }));
    expect(onChange).toHaveBeenCalledWith('third');
  });
});

describe('CheckList', () => {
  const options = [
    { value: 'red', label: 'Rot', count: 9 },
    { value: 'green', label: 'Grün', count: 131 },
  ];

  it('adds and removes values', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<CheckList label="Ampel" selected={['red']} onChange={onChange} options={options} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Grün/ }));
    expect(onChange).toHaveBeenLastCalledWith(['red', 'green']);

    rerender(<CheckList label="Ampel" selected={['red', 'green']} onChange={onChange} options={options} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Rot/ }));
    expect(onChange).toHaveBeenLastCalledWith(['green']);
  });

  it('pairs every traffic dot with its text label', () => {
    render(
      <CheckList label="Ampel" selected={[]} onChange={() => {}} options={options} dots={{ red: 'red', green: 'green' }} />,
    );
    const label = screen.getByRole('checkbox', { name: /Rot/ }).closest('label');
    expect(label?.querySelector('.bg-traffic-red')).not.toBeNull();
    expect(label).toHaveTextContent('Rot');
  });
});

describe('SelectField', () => {
  it('reports the chosen option', async () => {
    const onChange = vi.fn();
    render(<SelectField label="Marke" value="own" onChange={onChange} options={[...BRANDS]} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Marke' }), 'third');
    expect(onChange).toHaveBeenCalledWith('third');
  });
});

describe('KeyButtons', () => {
  it('toggles keys with aria-pressed', async () => {
    const onChange = vi.fn();
    render(
      <KeyButtons
        label="Drehklasse"
        selected={['A']}
        onChange={onChange}
        options={[
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(onChange).toHaveBeenLastCalledWith(['A', 'B']);
    await userEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
