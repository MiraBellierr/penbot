import { LANGUAGES, SOURCE_LANGUAGES } from '../../shared/languages';

interface Props {
  id: string;
  label: string;
  value: string;
  source?: boolean;
  onChange: (value: string) => void;
}

export function LanguageSelector({
  id,
  label,
  value,
  source = false,
  onChange,
}: Props) {
  const options = source ? SOURCE_LANGUAGES : LANGUAGES;
  return (
    <label className="language-field">
      <span>{label}</span>
      <input
        aria-label={label}
        list={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search or enter a language"
      />
      <datalist id={id}>
        {options.map((language) => (
          <option key={language} value={language} />
        ))}
      </datalist>
    </label>
  );
}
