export default function ScreenHeader({ title, subtitle, actions }) {
  return (
    <div className="screen-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="screen-actions">{actions}</div> : null}
    </div>
  );
}
