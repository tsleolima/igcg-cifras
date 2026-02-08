export function ErrorBanner(props: { message: string }) {
  return <div className="error">{props.message}</div>
}

export function SuccessBanner(props: { message: string }) {
  return <div className="success">{props.message}</div>
}
