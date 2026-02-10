export default function FundamentalsPanel({ companyName }) {
  return (
    <div className="card fundamentals">
      <div className="card-title">Fundamentals</div>
      <p className="muted">Snapshot for {companyName}</p>

      <table>
        <tbody>
          <tr>
            <td>Market Cap</td>
            <td>INR 3.4L Cr</td>
          </tr>
          <tr>
            <td>PE Ratio</td>
            <td>15.2</td>
          </tr>
          <tr>
            <td>Volume</td>
            <td>12.4M</td>
          </tr>
          <tr>
            <td>52W High</td>
            <td>INR 380</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
