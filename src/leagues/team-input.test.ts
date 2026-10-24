import { colorGrid, hasDuplicateGroupName, PALETTE, hasDuplicateTeam, parseHexColor, validateGroupName, validateTeamText } from './team-input';

describe('validateTeamText', () => {
  it('trims and enforces 1 to 40 characters', () => {
    expect(validateTeamText('  Boston ')).toEqual({ ok: true, value: 'Boston' });
    expect(validateTeamText('')).toEqual({ ok: false, error: 'empty' });
    expect(validateTeamText('  ')).toEqual({ ok: false, error: 'empty' });
    expect(validateTeamText('x'.repeat(40)).ok).toBe(true);
    expect(validateTeamText('x'.repeat(41))).toEqual({ ok: false, error: 'too-long' });
  });
});

describe('validateGroupName', () => {
  it('uses the same limits', () => {
    expect(validateGroupName(' East ')).toEqual({ ok: true, value: 'East' });
    expect(validateGroupName('')).toEqual({ ok: false, error: 'empty' });
    expect(validateGroupName('y'.repeat(41))).toEqual({ ok: false, error: 'too-long' });
  });
});

describe('duplicates', () => {
  const teams = [{ location: 'Boston', name: 'Bulldogs' }, null, { location: 'Austin', name: 'Owls' }];

  it('compares location and name together, ignoring case and spaces', () => {
    expect(hasDuplicateTeam(teams, { location: ' boston ', name: 'BULLDOGS' })).toBe(true);
    expect(hasDuplicateTeam(teams, { location: 'Boston', name: 'Owls' })).toBe(false);
  });

  it('skips the team being edited', () => {
    expect(hasDuplicateTeam(teams, { location: 'Boston', name: 'Bulldogs' }, 0)).toBe(false);
  });

  it('checks group names the same way', () => {
    expect(hasDuplicateGroupName(['East', 'West'], ' east ')).toBe(true);
    expect(hasDuplicateGroupName(['East', 'West'], 'East', 0)).toBe(false);
  });
});

describe('colors', () => {
  it('parses hex values to uppercase #RRGGBB', () => {
    expect(parseHexColor('#c62828')).toBe('#C62828');
    expect(parseHexColor(' 0d2a5b ')).toBe('#0D2A5B');
  });

  it('rejects short, long, non-hex and empty values', () => {
    for (const bad of ['', '#fff', '#12345', '#1234567', '#GGGGGG', 'red']) expect(parseHexColor(bad)).toBeNull();
  });
});

describe('PALETTE', () => {
  it('has 12 distinct valid colors', () => {
    expect(PALETTE).toHaveLength(12);
    expect(new Set(PALETTE.map((color) => color.hex)).size).toBe(12);
    PALETTE.forEach((color) => expect(parseHexColor(color.hex)).toBe(color.hex));
  });
});

describe('colorGrid', () => {
  it('has six rows of 12 valid, distinct uppercase colors', () => {
    const grid = colorGrid();
    expect(grid).toHaveLength(6);
    grid.forEach((row) => expect(row).toHaveLength(12));
    const all = grid.flat();
    all.forEach((hex) => expect(parseHexColor(hex)).toBe(hex));
    expect(new Set(all).size).toBe(all.length);
  });

  it('runs the last row from white to black and starts the hues at red', () => {
    const grid = colorGrid();
    expect(grid[5][0]).toBe('#FFFFFF');
    expect(grid[5][11]).toBe('#000000');
    expect(grid[2][0]).toBe('#E83030');
    expect(grid[2][4]).toBe('#30E830');
  });
});
