import Button from './Button.jsx'

/**
 * IconButton — icon-only button with accessible label.
 */
export default function IconButton({
  name,
  label,
  size = 'md',
  variant = 'ghost',
  ...rest
}) {
  return (
    <Button
      variant={variant}
      size={size}
      icon={name}
      iconOnly
      aria-label={label}
      {...rest}
    >
      {label}
    </Button>
  )
}
