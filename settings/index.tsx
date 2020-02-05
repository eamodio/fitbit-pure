const isVersa2 = (props: SettingsComponentProps) => props.settings.modelName === 'Versa 2';
const friendlyColor = (color: string | undefined) => {
	const name = color?.replace(/"/g, '')?.substr(3) ?? '';
	if (!name) return name;

	if (name === 'black') return 'None';
	if (name === 'light-gray') return 'Gray';
	return `${name[0].toUpperCase()}${name.substr(1)}`;
};
const friendlyOpacity = (value: string | undefined) => `${Number(value ?? 1) * 100}%`;

const debug = true;

function PureSettings(props: SettingsComponentProps) {
	const donated = props.settings.donated === 'true';
	return (
		<Page>
			<Section
				title={
					<TextImageRow
						label={<Text align="center">Fitbit Pure Clock</Text>}
						sublabel={
							<Text align="center">
								<Link source="https://pure.amod.io">
									<Text bold> pure.amod.io</Text>
								</Link>
							</Text>
						}
					/>
				}
			>
				<Text align="center">
					A beautifully designed, highly customizable, clean, and simple clock face for Fitbit Versa devices.
				</Text>
			</Section>

			{!donated && (
				<Section
					title={
						<TextImageRow
							label={
								<Text align="center">
									Get the <Text>PRO</Text> Features!
								</Text>
							}
							sublabel={
								<Text align="center">
									Donate for access to all <Text bold>PRO</Text> features
								</Text>
							}
						/>
					}
				>
					<Text align="center">
						<Text bold>PRO</Text> Features
					</Text>
					<TextImageRow
						label="🔒 Activity Stats"
						sublabel="See your steps, distance, active minutes, and calories"
					/>
					<TextImageRow label="🔒 Theming" sublabel="Choose colors that suit your style" />
					<TextImageRow
						label="🔒 On-device Quick Toggles"
						sublabel="Change the look and feel, right on your wrist"
					/>
					<Text>
						Your donation gives you access to all the <Text bold>PRO</Text> features above, and also
						supports this clock face and its on-going development.
					</Text>
					<Text align="center">
						<Link source="https://pure.amod.io">
							Donate at <Text bold>pure.amod.io</Text>
						</Link>
					</Text>
					<Text>
						Once you've donated, tap the <Text bold>&#x2764; Donate</Text> button, on your watch, and enter
						your donation code.
					</Text>
					<Text bold align="center">
						&#x2764; Thank you!
					</Text>
				</Section>
			)}

			<Section
				title={
					<TextImageRow
						label={
							<Text align="center">
								On-device Quick Toggles<Text> (PRO)</Text>
							</Text>
						}
						sublabel={<Text align="center">Quick and easy customizations, right on your wrist</Text>}
					/>
				}
				description={
					!donated && (
						<Text bold align="right">
							🔒 PRO
						</Text>
					)
				}
			>
				{!donated && <Text>🔒 Show on Long Press (Tap &amp; Hold)</Text>}
				{donated && <Toggle settingsKey="allowEditing" label="Show on Long Press (Tap &amp; Hold)" />}
			</Section>

			<Section
				title={
					<TextImageRow
						label={
							<Text align="center">
								Theming<Text> (PRO)</Text>
							</Text>
						}
						sublabel={<Text align="center">Choose colors that suit your style</Text>}
					/>
				}
				description={
					!donated && (
						<Text bold align="right">
							🔒 PRO
						</Text>
					)
				}
			>
				<Text>
					{donated ? '' : '🔒 '}Accent Color (Background)
					{donated && (
						<Text bold>
							<Text>: </Text>
							{friendlyColor(props.settings.accentBackgroundColor)}
						</Text>
					)}
				</Text>
				{donated && (
					<ColorSelect
						settingsKey="accentBackgroundColor"
						colors={[
							{ value: 'fb-black', color: '#000000' },
							{ value: 'fb-light-gray', color: '#A0A0A0' },
							{ value: 'fb-white', color: '#FFFFFF' },
							{ value: 'fb-lavender', color: '#BCD8F8' },
							{ value: 'fb-slate', color: '#7090B5' },
							{ value: 'fb-blue', color: '#3182DE' },
							{ value: 'fb-cyan', color: '#14D3F5' },
							{ value: 'fb-aqua', color: '#3BF7DE' },
							{ value: 'fb-cerulean', color: '#8080FF' },
							{ value: 'fb-indigo', color: '#5B4CFF' },
							{ value: 'fb-purple', color: '#BD4EFC' },
							{ value: 'fb-violet', color: '#D828B8' },
							{ value: 'fb-plum', color: '#A51E7C' },
							{ value: 'fb-magenta', color: '#F80070' },
							{ value: 'fb-pink', color: '#F83478' },
							{ value: 'fb-red', color: '#F83C40' },
							{ value: 'fb-orange', color: '#FC6B3A' },
							{ value: 'fb-peach', color: '#FFCC33' },
							{ value: 'fb-yellow', color: '#E4FA3C' },
							{ value: 'fb-lime', color: '#B8FC68' },
							{ value: 'fb-mint', color: '#5BE37D' },
							{ value: 'fb-green', color: '#00A629' }
						]}
					/>
				)}

				<Text>
					{donated ? '' : '🔒 '}Accent Color (Foreground)
					{donated && (
						<Text bold>
							<Text>: </Text>
							{friendlyColor(props.settings.accentForegroundColor)}
						</Text>
					)}
				</Text>
				{donated && (
					<ColorSelect
						settingsKey="accentForegroundColor"
						colors={[
							{ value: 'fb-light-gray', color: '#A0A0A0' },
							{ value: 'fb-white', color: '#FFFFFF' },
							{ value: 'fb-lavender', color: '#BCD8F8' },
							{ value: 'fb-slate', color: '#7090B5' },
							{ value: 'fb-blue', color: '#3182DE' },
							{ value: 'fb-cyan', color: '#14D3F5' },
							{ value: 'fb-aqua', color: '#3BF7DE' },
							{ value: 'fb-cerulean', color: '#8080FF' },
							{ value: 'fb-indigo', color: '#5B4CFF' },
							{ value: 'fb-purple', color: '#BD4EFC' },
							{ value: 'fb-violet', color: '#D828B8' },
							{ value: 'fb-plum', color: '#A51E7C' },
							{ value: 'fb-magenta', color: '#F80070' },
							{ value: 'fb-pink', color: '#F83478' },
							{ value: 'fb-red', color: '#F83C40' },
							{ value: 'fb-orange', color: '#FC6B3A' },
							{ value: 'fb-peach', color: '#FFCC33' },
							{ value: 'fb-yellow', color: '#E4FA3C' },
							{ value: 'fb-lime', color: '#B8FC68' },
							{ value: 'fb-mint', color: '#5BE37D' },
							{ value: 'fb-green', color: '#00A629' }
						]}
					/>
				)}
			</Section>

			<Section title={<TextImageRow label={<Text align="center">Date &amp; Time Display</Text>} />}>
				<Toggle settingsKey="animateSeparator" label="Animate Time Separator" />
				<Toggle settingsKey="showDate" label="Show Date" />
				<Toggle settingsKey="showLeadingZero" label="Show Leading Zero" />
				<Toggle settingsKey="showSeconds" label="Show Seconds" />
			</Section>

			<Section title={<TextImageRow label={<Text align="center">Battery Display</Text>} />}>
				<Toggle settingsKey="showBatteryPercentage" label="Show Percentage" />
			</Section>

			<Section title={<TextImageRow label={<Text align="center">Heart Rate Display</Text>} />}>
				<Select
					label="Animate Heart Rate"
					settingsKey="animateHeartRate"
					selectViewTitle="Animate Heart Rate"
					options={[
						{
							name: 'No Animation',
							description: '',
							value: 'off'
						},
						{
							name: 'Pulse (regularly)',
							description: 'Always pulses at 60 BPM',
							value: 'interval'
						},
						{
							name: 'Pulse (heart rate)',
							description: 'Pulses with your heart rate. Can affect battery life',
							value: 'pulse'
						}
					]}
					renderItem={option => <TextImageRow label={option.name} sublabel={option.description} />}
				/>
				<Toggle settingsKey="showRestingHeartRate" label="Show Resting Heart Rate" />
			</Section>

			<Section
				title={<TextImageRow label={<Text align="center">Activity Stats Display (PRO)</Text>} />}
				description={
					!donated && (
						<Text bold align="right">
							🔒 PRO
						</Text>
					)
				}
			>
				{!donated && <Text>🔒 Show Units</Text>}
				{donated && <Toggle settingsKey="showActivityUnits" label="Show Units" />}
			</Section>

			{isVersa2(props) && (
				<Section title={<TextImageRow label={<Text align="center">Always-on Display</Text>} />}>
					<Slider
						label={
							<Text>
								Brightness: <Text bold>{friendlyOpacity(props.settings.aodOpacity)}</Text>
							</Text>
						}
						settingsKey="aodOpacity"
						min="0.3"
						max="1"
						step="0.1"
					/>
				</Section>
			)}

			<Button
				label="Reset All Settings"
				onClick={() => {
					props.settingsStorage.clear();
					if (donated) {
						props.settingsStorage.setItem('donated', 'true');
					}
				}}
			/>

			{debug && <Toggle settingsKey="donated" label="Donated" />}
		</Page>
	);
}

registerSettingsPage(PureSettings);
