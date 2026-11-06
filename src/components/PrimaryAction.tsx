import { ActionIcon, Button } from '@mantine/core'

export function PrimaryAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <>
      <Button visibleFrom="sm" onClick={onClick}>
        {label}
      </Button>
      <ActionIcon
        hiddenFrom="sm"
        size={56}
        radius="xl"
        variant="filled"
        aria-label={label}
        onClick={onClick}
        style={{ position: 'fixed', right: 16, bottom: 80, zIndex: 200, fontSize: 32, lineHeight: 1 }}
      >
        +
      </ActionIcon>
    </>
  )
}
