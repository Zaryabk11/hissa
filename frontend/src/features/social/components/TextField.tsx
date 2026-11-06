import { TextInput, type TextInputProps } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { hissaFonts, hissaRadii } from '../../../shared/theme/hissaTokens';

export function TextField(props: TextInputProps) {
  const t = useHissaTheme();
  return (
    <TextInput
      autoCapitalize="none"
      autoCorrect={false}
      placeholderTextColor={t.muted}
      {...props}
      style={{
        minHeight: 48,
        paddingHorizontal: 16,
        borderRadius: hissaRadii.control,
        borderWidth: 2,
        borderColor: t.line,
        backgroundColor: t.surf,
        color: t.ink,
        fontFamily: hissaFonts.body400,
        fontSize: 16,
      }}
    />
  );
}
