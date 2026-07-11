import { Link } from 'react-router-dom';
import { useNormPersonCalculation } from '@/api/normPerson';

interface Props {
  age: number;
  gender: string;
  pal: number;
}

export function MemberNormFactor({ age, gender, pal }: Props) {
  const { data, isLoading } = useNormPersonCalculation(age, gender, pal);

  return (
    <Link
      to={`/tools/norm-portion-simulator?pal=${pal}&age=${age}&gender=${gender}`}
      className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
      title="Normportion-Simulator öffnen"
    >
      {isLoading ? (
        <span className="text-muted-foreground">…</span>
      ) : data ? (
        <>{data.norm_factor.toFixed(1)} N.P.</>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </Link>
  );
}
