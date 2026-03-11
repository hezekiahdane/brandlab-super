import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface StatusChangeEmailProps {
  draftTitle: string;
  message: string;
  link: string;
}

export function StatusChangeEmail({
  draftTitle,
  message,
  link,
}: StatusChangeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{message}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Draft Status Updated</Heading>

          <Section style={section}>
            <Text style={text}>{message}</Text>
            <Text style={textMuted}>
              Draft: <strong>{draftTitle}</strong>
            </Text>
          </Section>

          <Section style={buttonSection}>
            <Link href={link} style={button}>
              View Draft
            </Link>
          </Section>

          <Text style={footer}>
            You received this email because a draft you&apos;re involved with
            changed status. You can manage notification preferences in your
            workspace settings.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '560px',
  borderRadius: '8px',
};

const heading: React.CSSProperties = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '600',
  color: '#111',
  padding: '17px 24px 0',
};

const section: React.CSSProperties = {
  padding: '0 24px',
};

const text: React.CSSProperties = {
  margin: '0 0 10px 0',
  color: '#333',
  fontSize: '15px',
  lineHeight: '1.5',
};

const textMuted: React.CSSProperties = {
  margin: '0 0 10px 0',
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.5',
};

const buttonSection: React.CSSProperties = {
  padding: '16px 24px',
};

const button: React.CSSProperties = {
  backgroundColor: '#18181b',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer: React.CSSProperties = {
  color: '#999',
  fontSize: '12px',
  lineHeight: '1.5',
  padding: '0 24px',
  marginTop: '24px',
};
