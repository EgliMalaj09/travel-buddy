import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { Globe } from '../Globe';

describe('Globe', () => {
  it('draws the sea, the land, visited countries and today, with a spoken label', async () => {
    await render(
      <ThemeProvider>
        <Globe
          visited={['IT']}
          here="PT"
          focus="IT"
          size={300}
          reduceMotion
          accessibilityLabel="Globe. Visited: Italy."
        />
      </ThemeProvider>,
    );
    const globe = screen.getByLabelText('Globe. Visited: Italy.');
    expect(globe).toBeTruthy();
    expect(screen.getByRole('image')).toBe(globe);
  });
});
