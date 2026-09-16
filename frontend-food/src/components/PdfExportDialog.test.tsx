// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PdfExportDialog } from './PdfExportDialog';

describe('PdfExportDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the selected serving count to the recipe PDF URL', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    render(
      <PdfExportDialog
        open
        onOpenChange={() => {}}
        baseUrl="https://example.test/api/recipes/by-slug/pfannkuchen/export/pdf/"
        optionType="recipe"
      />,
    );

    fireEvent.change(screen.getByTestId('pdf-servings-input'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /PDF öffnen/ }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain('servings=4');
    expect(url).toContain('page_format=A4');
  });

  it('shows German explanatory text for the serving scaling', () => {
    render(
      <PdfExportDialog
        open
        onOpenChange={() => {}}
        baseUrl="https://example.test/api/recipes/by-slug/pfannkuchen/export/pdf/"
        optionType="recipe"
      />,
    );

    expect(screen.getByText(/auf die gewählte Personenzahl skaliert/)).toBeInTheDocument();
    expect(screen.getByText(/gespeicherten Rezeptdaten bleiben unverändert/)).toBeInTheDocument();
  });

  it.each(['0', '101', '-3', ''])(
    'disables the open button and shows an error for invalid serving count %s',
    (value) => {
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

      render(
        <PdfExportDialog
          open
          onOpenChange={() => {}}
          baseUrl="https://example.test/api/recipes/by-slug/pfannkuchen/export/pdf/"
          optionType="recipe"
        />,
      );

      fireEvent.change(screen.getByTestId('pdf-servings-input'), { target: { value } });

      expect(screen.getByTestId('pdf-servings-error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /PDF öffnen/ })).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: /PDF öffnen/ }));
      expect(openSpy).not.toHaveBeenCalled();
    },
  );

  it('accepts serving counts at the 1–100 boundaries', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    const { rerender } = render(
      <PdfExportDialog
        open
        onOpenChange={() => {}}
        baseUrl="https://example.test/api/recipes/by-slug/pfannkuchen/export/pdf/"
        optionType="recipe"
      />,
    );

    fireEvent.change(screen.getByTestId('pdf-servings-input'), { target: { value: '1' } });
    expect(screen.getByRole('button', { name: /PDF öffnen/ })).toBeEnabled();

    fireEvent.change(screen.getByTestId('pdf-servings-input'), { target: { value: '100' } });
    expect(screen.getByRole('button', { name: /PDF öffnen/ })).toBeEnabled();

    rerender(
      <PdfExportDialog
        open={false}
        onOpenChange={() => {}}
        baseUrl="https://example.test/api/recipes/by-slug/pfannkuchen/export/pdf/"
        optionType="recipe"
      />,
    );
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('keeps meal-plan options unchanged and without a servings control', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    render(
      <PdfExportDialog
        open
        onOpenChange={() => {}}
        baseUrl="https://example.test/api/meal-plans/1/export/pdf/"
        optionType="meal_plan"
      />,
    );

    expect(screen.getByText('Einkaufsliste')).toBeInTheDocument();
    expect(screen.getByText('Nährwert-Tabelle')).toBeInTheDocument();
    expect(screen.getByText('Allergen-Matrix')).toBeInTheDocument();
    expect(screen.getByText('Kompaktmodus (fortlaufend)')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-servings-input')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /PDF öffnen/ }));

    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain('include_notes=true');
    expect(url).not.toContain('servings=');
  });
});
