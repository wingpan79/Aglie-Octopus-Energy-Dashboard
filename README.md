# Octopus Energy Price Dashboard

A simple, interactive dashboard that displays tomorrow's electricity prices for the Octopus Energy Agile tariff, helping you identify the cheapest and most expensive times to use electricity.

https://wingpan79.github.io/Aglie-Octopus-Energy-Dashboard/

## How It Works

This dashboard connects directly to the Octopus Energy API to fetch real-time pricing data for the Agile tariff. It:

1. Retrieves the latest pricing data from the Octopus Energy API
2. Filters for tomorrow's prices only
3. Analyzes the data to find price patterns and optimal usage periods
4. Displays the information in an easy-to-understand dashboard format

## Technical Details

- **Pure HTML/CSS/JavaScript**: No frameworks or build steps required
- **Chart.js**: Used for the interactive price visualization
- **Live Data**: Connects directly to the official Octopus Energy API
- **Client-side Processing**: All data processing happens in your browser
- **No Authentication Required**: Uses the public pricing API endpoint

## API Information

This dashboard uses the following Octopus Energy API endpoint:
```
https://api.octopus.energy/v1/products/AGILE-24-10-01/electricity-tariffs/E-1R-AGILE-24-10-01-G/standard-unit-rates/
```

This is a public endpoint that provides tariff information without requiring authentication.

## Customization

If you're on a different Agile tariff version or region, you can modify the API URL in the JavaScript code:

```javascript
// Change this URL to match your specific tariff
const apiUrl = 'https://api.octopus.energy/v1/products/AGILE-24-10-01/electricity-tariffs/E-1R-AGILE-24-10-01-G/standard-unit-rates/';
```

## Limitations

- Only works with Octopus Energy Agile tariff
- Displays data for tomorrow only (next 24 hours)
- Requires an internet connection to fetch the latest pricing data

## Contributing

Feel free to fork this project and enhance it! Some ideas for improvements:
- Add support for multiple days of price forecasting
- Include historical price comparison
- Add energy usage planning tools
- Implement local storage to remember preferences
- Email notification

## License

This project is available under the MIT License - feel free to use, modify and share!
