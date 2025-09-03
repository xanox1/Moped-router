# Dutch Traffic Signs Support in Moped Router

This document details the comprehensive Dutch traffic signs support implemented in the Moped Router for more accurate moped routing using OpenStreetMap data.

## Overview

The Moped Router now supports Dutch traffic signs as defined in OpenStreetMap's tagging conventions, providing more accurate routing decisions based on real-world traffic regulations. This implementation follows the [NL:Overzicht Nederlandse Verkeersborden](https://wiki.openstreetmap.org/wiki/NL:Overzicht_Nederlandse_Verkeersborden) standard.

## Supported Dutch Traffic Signs

### Prohibition Signs (Moped Blocked)

| Sign Code | Description | OSM Tag | Effect |
|-----------|-------------|---------|--------|
| `NL:C5` | Gesloten voor bromfietsen (Moped prohibited) | `traffic_sign=NL:C5` | Completely blocks moped routing |
| `NL:C2` | Gesloten voor motorvoertuigen (Motor vehicles prohibited) | `traffic_sign=NL:C2` | Blocks moped routing (mopeds are motor vehicles) |
| `NL:C7` | Gesloten voor alle voertuigen (All vehicles prohibited) | `traffic_sign=NL:C7` | Blocks moped routing |
| `NL:C1` | Gesloten voor alle verkeer (All traffic prohibited) | `traffic_sign=NL:C1` | Blocks moped routing |
| `NL:C12` | Verboden voor motorvoertuigen (Motor vehicles prohibited) | `traffic_sign=NL:C12` | Blocks moped routing |

### Designated Infrastructure (Moped Preferred)

| Sign Code | Description | OSM Tag | Effect |
|-----------|-------------|---------|--------|
| `NL:G12a` | Fiets/bromfietspad (Cycle/moped path) | `traffic_sign=NL:G12a` | 1.5x priority boost, 0.8x distance penalty |
| `NL:G13` | Bromfietspad (Moped path) | `traffic_sign=NL:G13` | Preferred routing for mopeds |
| `NL:G11` | Fietspad (Cycle path) | `traffic_sign=NL:G11` | May allow moped access depending on local rules |

### Speed Limit Signs

| Sign Code | Description | OSM Tag Example | Effect |
|-----------|-------------|-----------------|--------|
| `NL:A1-30` | Maximum snelheid 30 km/h | `traffic_sign=NL:A1-30` | Respects speed limit if ≤ 45 km/h |
| `NL:A1-50` | Maximum snelheid 50 km/h | `traffic_sign=NL:A1-50` | Blocks moped routing (> 45 km/h) |
| `NL:A4-30` | Begin zone 30 km/h | `zone:traffic_sign=NL:A4-30` | Zone-based speed restriction |
| `NL:A5-30` | Einde zone 30 km/h | `zone:traffic_sign=NL:A5-30` | End of speed zone |

## Zone-Based Restrictions

The system supports zone-based traffic regulations:

### Speed Zones
- `zone:maxspeed=30` - Speed zones with specific limits
- `zone:traffic_sign=NL:A4-30` - Official speed zone start signs
- `zone:traffic_sign=NL:A5-30` - Official speed zone end signs

### Effect on Routing
- **Zone speed ≤ 45 km/h**: Allowed, speed limited to zone limit
- **Zone speed > 45 km/h**: Completely blocked for moped routing

## Cycleway Integration

Enhanced support for moped access on cycle infrastructure:

### Cycleway Access Tags
- `cycleway:moped=designated` - Dedicated moped access (1.5x priority)
- `cycleway:moped=yes` - Moped access allowed (1.2x priority)
- `cycleway:moped=no` - Moped access prohibited (blocked)
- `cycleway:moped=use_sidepath` - Mopeds must use separate path

### Direction-Specific Access
- `cycleway:right:moped=yes` - Moped access on right side
- `cycleway:left:moped=yes` - Moped access on left side

## Implementation Details

### GraphHopper Configuration

**Encoded Values** (`config.yml`):
```yaml
graph.encoded_values: road_class, max_speed, moped, motor_vehicle, vehicle, traffic_sign, zone_maxspeed, cycleway_moped
```

**Custom Model Rules** (`moped-rules.json`):
```json
{
  "priority": [
    {
      "if": "traffic_sign == 'NL:C5'",
      "multiply_by": 0
    },
    {
      "if": "cycleway_moped == designated || traffic_sign == 'NL:G12a'",
      "multiply_by": "1.5"
    }
  ]
}
```

### Web Application Integration

**Overpass API Queries**: Enhanced to include traffic sign data:
```javascript
way(around:50,${lat},${lng})[traffic_sign~"NL:"];
way(around:50,${lat},${lng})[zone:maxspeed];
way(around:50,${lat},${lng})[cycleway:moped];
```

**Dynamic Route Parameters**: Traffic sign blocking rules added to all routing requests:
```javascript
const dutchProhibitionSigns = ['NL:C5', 'NL:C2', 'NL:C7', 'NL:C1', 'NL:C12'];
dutchProhibitionSigns.forEach((sign, index) => {
    url.searchParams.append(`custom_model.priority[${paramIndex}].if`, `traffic_sign == '${sign}'`);
    url.searchParams.append(`custom_model.priority[${paramIndex}].multiply_by`, '0');
});
```

## Context Information Display

When right-clicking on the map, the application now shows:

### Traffic Signs Section
```
🛵 Gesloten voor bromfietsen (Closed for mopeds) (NL:C5)
🚗 Maximum snelheid 30 km/h (Speed limit 30 km/h) (NL:A1-30)
```

### Moped Infrastructure Section
```
🚴 Hoofdstraat - Moped access: designated
⚡ Speed zone: 30 km/h
📍 Zone sign: NL:A4-30
```

### Enhanced Road Information
```
Hoofdstraat (residential) (30 km/h) [Moped: designated]
```

## Data Sources and Accuracy

### OpenStreetMap Data Quality
- Traffic signs are mapped by community contributors
- Coverage varies by region and mapping activity
- Most accurate in urban areas with active mapping communities

### Fallback Mechanisms
1. **Primary**: Dutch traffic signs (`traffic_sign=NL:*`)
2. **Secondary**: Access tags (`moped=no`, `motor_vehicle=no`)
3. **Tertiary**: Speed limits (`maxspeed`, `zone:maxspeed`)
4. **Final**: Road classification (PRIMARY roads blocked)

## Testing and Validation

### Automated Tests
- 42 comprehensive tests covering all traffic sign functionality
- Tests verify blocking rules, preference rules, and zone restrictions
- Configuration validation ensures all encoded values are present

### Manual Testing
Test locations with known traffic signs:
1. Amsterdam city center (various prohibition signs)
2. Cycle paths with moped access indicators
3. Speed zones in residential areas
4. N-roads with PRIMARY classification

### Example Test Scenarios
```javascript
// Test moped prohibition sign blocking
expect(mopedRules.priority.find(rule => 
  rule.if === "traffic_sign == 'NL:C5'"
)).toHaveProperty('multiply_by', 0);

// Test moped path preference
expect(mopedRules.priority.find(rule => 
  rule.if === "traffic_sign == 'NL:G12a'"
)).toHaveProperty('multiply_by', '1.5');
```

## Future Enhancements

### Planned Improvements
1. **Conditional restrictions**: Time-based and vehicle-type conditional access
2. **Combined signs**: Support for multiple signs on single elements
3. **Regional variations**: Provincial or municipal traffic sign variants
4. **Real-time updates**: Integration with dynamic traffic sign systems

### Community Contributions
- Encourage OSM contributors to add missing traffic signs
- Provide feedback mechanisms for routing accuracy
- Documentation for adding new Dutch traffic sign types

## References

- [OpenStreetMap Dutch Traffic Signs Wiki](https://wiki.openstreetmap.org/wiki/NL:Overzicht_Nederlandse_Verkeersborden)
- [Dutch Road Traffic Act (RVV 1990)](https://wetten.overheid.nl/BWBR0004825/)
- [GraphHopper Custom Models Documentation](https://docs.graphhopper.com/core/custom-models/)
- [Overpass API Documentation](https://wiki.openstreetmap.org/wiki/Overpass_API)