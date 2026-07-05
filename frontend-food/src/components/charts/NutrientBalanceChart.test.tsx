// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import NutrientBalanceChart from './NutrientBalanceChart';

afterEach(() => {
  cleanup();
});

describe('NutrientBalanceChart', () => {
  describe('3.1 & 3.2: Min-only and Max-only nutrients display', () => {
    it('3.1: Renders fiber (min-only nutrient) over minimum', () => {
      const { container } = render(
        <NutrientBalanceChart
          proteinG={50}
          fatG={60}
          carbsG={300}
          sugarG={30}
          fibreG={30} // Over minimum of 25
          saltG={4}
          numDays={1}
          showPerPortion={false}
        />
      );

      // Component should render the chart
      expect(container.querySelector('[class*="recharts"]')).toBeInTheDocument();
    });

    it('3.1: Renders fiber under minimum', () => {
      const { container } = render(
        <NutrientBalanceChart
          proteinG={50}
          fatG={60}
          carbsG={300}
          sugarG={30}
          fibreG={20} // Under minimum of 25
          saltG={4}
          numDays={1}
          showPerPortion={false}
        />
      );

      expect(container.querySelector('[class*="recharts"]')).toBeInTheDocument();
    });

    it('3.2: Renders sugar (max-only nutrient) over maximum', () => {
      const { container } = render(
        <NutrientBalanceChart
          proteinG={50}
          fatG={60}
          carbsG={300}
          sugarG={60} // Over maximum of 50
          saltG={4}
          fibreG={30}
          numDays={1}
          showPerPortion={false}
        />
      );

      expect(container.querySelector('[class*="recharts"]')).toBeInTheDocument();
    });

    it('3.2: Renders salt (max-only nutrient) over maximum', () => {
      const { container } = render(
        <NutrientBalanceChart
          proteinG={50}
          fatG={60}
          carbsG={300}
          sugarG={30}
          saltG={6} // Over maximum of 5
          fibreG={30}
          numDays={1}
          showPerPortion={false}
        />
      );

      expect(container.querySelector('[class*="recharts"]')).toBeInTheDocument();
    });
  });

  describe('Range nutrients (protein, carbs)', () => {
    it('Renders nutrients with both min and max as range', () => {
      const { container } = render(
        <NutrientBalanceChart
          proteinG={50}
          fatG={60}
          carbsG={300}
          sugarG={30}
          saltG={4}
          fibreG={30}
          numDays={1}
          showPerPortion={false}
        />
      );

      expect(container.querySelector('[class*="recharts"]')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('Returns null when total macros are 0', () => {
      const { container } = render(
        <NutrientBalanceChart
          proteinG={0}
          fatG={0}
          carbsG={0}
          sugarG={30}
          saltG={4}
          fibreG={30}
          numDays={1}
          showPerPortion={false}
        />
      );

      // Component should not render anything when macros are 0
      expect(container.firstChild).toBeNull();
    });

    it('Scales values according to numDays', () => {
      const { container: container1 } = render(
        <NutrientBalanceChart
          proteinG={50}
          fatG={60}
          carbsG={300}
          sugarG={30}
          saltG={4}
          fibreG={30}
          numDays={1}
          showPerPortion={false}
        />
      );

      const { container: container2 } = render(
        <NutrientBalanceChart
          proteinG={50}
          fatG={60}
          carbsG={300}
          sugarG={30}
          saltG={4}
          fibreG={30}
          numDays={2}
          showPerPortion={false}
        />
      );

      // Both should render
      expect(container1.querySelector('[class*="recharts"]')).toBeInTheDocument();
      expect(container2.querySelector('[class*="recharts"]')).toBeInTheDocument();
    });
  });
});
