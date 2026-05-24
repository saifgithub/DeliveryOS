import * as RadioGroup from '@radix-ui/react-radio-group';
import type { HarnessProfileWire, ProfileName } from '@deliveryos/contracts';

export interface ProfilePickerProps {
  readonly profiles: readonly HarnessProfileWire[];
  readonly selected: ProfileName;
  readonly onChange: (name: ProfileName) => void;
}

export function ProfilePicker({ profiles, selected, onChange }: ProfilePickerProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold text-dos-accent">Profile</h2>
      <RadioGroup.Root
        value={selected}
        onValueChange={(v) => onChange(v as ProfileName)}
        className="flex flex-wrap gap-2"
      >
        {profiles.map((p) => (
          <label
            key={p.name}
            className={[
              'flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded border text-sm',
              selected === p.name
                ? 'border-dos-accent bg-dos-surface text-vscode-fg'
                : 'border-vscode-border text-dos-muted hover:text-vscode-fg',
            ].join(' ')}
            title={`${p.display_name} — writes ${p.instruction_file}`}
          >
            <RadioGroup.Item
              value={p.name}
              className="w-3 h-3 rounded-full border border-current data-[state=checked]:bg-dos-accent"
            >
              <RadioGroup.Indicator className="block w-full h-full rounded-full" />
            </RadioGroup.Item>
            <span>{p.display_name}</span>
            <span className="font-mono text-[10px] text-dos-muted">{p.instruction_file}</span>
          </label>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
