const isVersa2 = (props: SettingsComponentProps) => props.settings.modelName === 'Versa 2';
const friendlyColor = (value: string | undefined) => value?.replace(/"/g, '')?.substr(3) ?? '';
const friendlyOpacity = (value: string | undefined) => `${Number(value ?? 1) * 100}%`;

function PureSettings(props: SettingsComponentProps) {
	return (
		<Page>
			{isVersa2(props) && (
				<Section
					title={
						<Text bold align="center">
							Always-on Display
						</Text>
					}
				>
					<Slider
						label={`Brightness: ${friendlyOpacity(props.settings.aodOpacity)}`}
						settingsKey="aodOpacity"
						min="0.3"
						max="1"
						step="0.1"
					/>
				</Section>
			)}

			<Section
				title={
					<Text bold align="center">
						Theme
					</Text>
				}
			>
				<Text>{`Accent Color: ${friendlyColor(props.settings.accentColor)}`}</Text>
				<ColorSelect
					settingsKey="accentColor"
					colors={[
						{ value: 'fb-black', color: '#000000' },
						{ value: 'fb-dark-gray', color: '#505050' },
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
			</Section>

			<Section
				title={
					<Text bold align="center">
						Time Display
					</Text>
				}
			>
				<Toggle settingsKey="animateSeparator" label="Animate Time Separator" />
				<Toggle settingsKey="showDate" label="Show Date" />
				<Toggle settingsKey="showLeadingZero" label="Show Leading Zero" />
				<Toggle settingsKey="showSeconds" label="Show Seconds" />
			</Section>

			<Section
				title={
					<Text bold align="center">
						Battery Display
					</Text>
				}
			>
				<Toggle settingsKey="showBatteryPercentage" label="Show Percentage" />
			</Section>

			<Section
				title={
					<Text bold align="center">
						Heart Rate Display
					</Text>
				}
			>
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
				title={
					<Text bold align="center">
						Activity Display
					</Text>
				}
			>
				<Toggle settingsKey="showActivityUnits" label="Show Units" />
			</Section>

			<Button label="Reset All Settings" onClick={() => props.settingsStorage.clear()} />
		</Page>
	);
}

registerSettingsPage(PureSettings);
