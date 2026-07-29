import bcrypt from 'bcrypt';
import generator from 'generate-password';

interface GeneratePasswordProps {
  password?: string;
}

interface GeneratePasswordResult {
  password: string;
  hash: string;
}

export async function generatePassword(
  props: GeneratePasswordProps = {},
): Promise<GeneratePasswordResult> {
  const password = props.password || generator.generate({
    length: 16,
    numbers: true,
    symbols: true,
    uppercase: true,
    lowercase: true,
    strict: true,
  });

  const saltRounds = Number(process.env.SALT) || 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(password, salt);

  return { password, hash };
}
