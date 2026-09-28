import { Link } from 'react-router-dom';
import { useNormPersonCalculation } from '@/api/normPerson';
import { formatNumber } from '@/lib/format';

interface Props {
  age: number;
  gender: string;
  pal: number;
}

export function MemberNormFactor({ age, gender, pal }: Props) {
  const calcGender = gender === 'no_answer' ? 'male' : gender;
  const { data, isLoading } = useNormPersonCalculation(age, calcGender, pal);

  return (
    <Link
      to={`/tools/norm-portion-simulator?pal=${pal}&age=${age}&gender=${gender === 'no_answer' ? 'male' : gender}`}
      className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
      title="Normportion-Simulator öffnen"
    >
      {isLoading ? (
        <span className="text-muted-foreground">…</span>
      ) : data ? (
        <>{formatNumber(data.norm_factor, { maxDecimals: 1 })} N.P.</>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </Link>
  );
}
