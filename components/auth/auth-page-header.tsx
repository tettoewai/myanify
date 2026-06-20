interface AuthPageHeaderProps {
  subtitle: string;
}

export function AuthPageHeader({ subtitle }: AuthPageHeaderProps) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-foreground">Myanify</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
    </div>
  );
}
