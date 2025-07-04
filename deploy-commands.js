const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('nexus')
    .setDescription('Chat with Nexus, your wasteland AI companion')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your message to Nexus')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hi to Nexus'),
  new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll up to 5 six-sided dice')
    .addIntegerOption(option =>
      option
        .setName('dice')
        .setDescription('Number of dice to roll (1-5)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5)),
  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get user info'),
  new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Play a radio station')
    .addStringOption(option =>
      option.setName('station')
        .setDescription('Station name, URL, or file')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('silo-codes')
    .setDescription('Get Fallout 76 silo codes'),
  new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join voice channel'),
  new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave voice channel'),
  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause music'),
  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume music'),
  new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a meme')
    .addStringOption(option =>
      option.setName('topic')
        .setDescription('Subreddit (optional)')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip current song'),
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music and leave'),
  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View music queue'),
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song name, YouTube URL, Spotify URL, or SoundCloud URL')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),
  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Poll question')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Poll duration (e.g., "5 minutes", "2 hours", "1 day")')
        .setRequired(true)
        .addChoices(
          { name: 'Minutes', value: 'minutes' },
          { name: 'Hours', value: 'hours' },
          { name: 'Days', value: 'days' }
        ))
    .addIntegerOption(option =>
      option.setName('duration_value')
        .setDescription('Duration value (e.g., 5 for 5 minutes/hours/days)')
        .setRequired(true)
        .setMinValue(1)),
  new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),
  new SlashCommandBuilder()
    .setName('randomnumber')
    .setDescription('Get a random number')
    .addIntegerOption(option =>
      option.setName('min')
        .setDescription('Minimum (default 1)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('max')
        .setDescription('Maximum (default 100)')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages (1-100)')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox-status')
    .setDescription('Check Xbox Live status'),
  new SlashCommandBuilder()
    .setName('xbox-profile')
    .setDescription('Get Xbox profile')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Xbox gamertag')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox-gamercard')
    .setDescription('Get Xbox gamercard')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Xbox gamertag')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox-achievements')
    .setDescription('Get Xbox achievements')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Xbox gamertag')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox-friends')
    .setDescription('Get Xbox friends')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Xbox gamertag')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox-clip')
    .setDescription('Get Xbox clip')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Xbox gamertag')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox-screenshot')
    .setDescription('Get Xbox screenshot')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Xbox gamertag')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox-gametime')
    .setDescription('Get Xbox play time')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Xbox gamertag')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox-leaderboard')
    .setDescription('Get Fallout 76 leaderboard'),
  new SlashCommandBuilder()
    .setName('xbox-activity')
    .setDescription('Get Xbox activity')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Xbox gamertag')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('xbox-gameinfo')
    .setDescription('Get game info')
    .addStringOption(option =>
      option.setName('game')
        .setDescription('Game name')
        .setRequired(true)
        .addChoices(
          { name: 'Fallout 76', value: 'fallout76' },
          { name: 'GTA V', value: 'gtav' },
          { name: 'WoW', value: 'wow' },
          { name: 'Deadside', value: 'deadside' },
        )),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands'),
  new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Fetch lyrics for a song')
    .addStringOption(option =>
      option.setName('song')
        .setDescription('Song name or current song')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('history')
    .setDescription('View recently played songs'),
  new SlashCommandBuilder()
    .setName('tadpole')
    .setDescription('Get Tadpole Exam questions and answers for a selected category'),
  new SlashCommandBuilder()
    .setName('possum')
    .setDescription('Get Possum Exam questions and answers for a selected category'),
  new SlashCommandBuilder()
    .setName('grab')
    .setDescription('Send the current song details to your DMs'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
})();