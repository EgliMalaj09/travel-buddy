import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'alt' | 'ghost' | 'danger';

/** Button (design guide): primary is ink; buttons say what happens ("Suspend account"). */
export function Button({
  variant = 'primary',
  small,
  block,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean; block?: boolean }) {
  const classes = ['btn', variant !== 'primary' && variant, small && 'sm', block && 'block', className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
