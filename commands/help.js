const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands'),
  permissions: [],
  async execute(interaction) {
    const commands = [
      { name: 'chat', description: 'Chat with Nexus AI' },
      { name: 'hello', description: 'Say hi to Nexus' },
      { name: 'roll', description: 'Roll a 6-sided die' },
      { name: 'userinfo', description: 'Get user info' },
      { name: 'radio', description: 'Play a radio station' },
      { name: 'silo-codes', description: 'Get Fallout 76 silo codes' },
      { name: 'join', description: 'Join voice channel' },
      { name: 'leave', description: 'Leave voice channel' },
      { name: 'pause', description: 'Pause music' },
      { name: 'resume', description: 'Resume music' },
      { name: 'meme', description: 'Get a meme' },
      { name: 'skip', description: 'Skip current song' },
      { name: 'stop', description: 'Stop music and leave' },
      { name: 'queue', description: 'View music queue' },
      { name: 'play', description: 'Play a song or playlist from YouTube, Spotify, or SoundCloud' },
      { name: 'ping', description: 'Check bot latency' },
      { name: 'poll', description: 'Create a poll' },
      { name: 'coinflip', description: 'Flip a coin' },
      { name: 'randomnumber', description: 'Get a random number' },
      { name: 'clear', description: 'Clear messages (requires Manage Messages permission)' },
      { name: 'xbox-status', description: 'Check Xbox Live status' },
      { name: 'xbox-profile', description: 'Get Xbox profile' },
      { name: 'xbox-gamercard', description: 'Get Xbox gamercard' },
      { name: 'xbox-achievements', description: 'Get Xbox achievements' },
      { name: 'xbox-friends', description: 'Get Xbox friends' },
      { name: 'xbox-clip', description: 'Get Xbox clip' },
      { name: 'xbox-screenshot', description: 'Get Xbox screenshot' },
      { name: 'xbox-gametime', description: 'Get Xbox play time' },
      { name: 'xbox-leaderboard', description: 'Get Fallout 76 leaderboard' },
      { name: 'xbox-activity', description: 'Get Xbox activity' },
      { name: 'xbox-gameinfo', description: 'Get game info' },
      { name: 'lyrics', description: 'Fetch lyrics for a song' },
      { name: 'history', description: 'View recently played songs' },
    ];

    // Split commands into chunks of 25 to respect embed field limit
    const chunks = [];
    for (let i = 0; i < commands.length; i += 25) {
      chunks.push(commands.slice(i, i + 25));
    }

    // Create and send embeds
    const embeds = chunks.map((chunk, index) => {
      return new EmbedBuilder()
        .setTitle(`📜 Nexus Command List ${index > 0 ? ` (Part ${index + 1})` : ''}`)
        .setDescription('Here are the available commands:')
        .addFields(chunk.map(cmd => ({ name: `/${cmd.name}`, value: cmd.description, inline: true })))
        .setColor(0x3498db)
        .setTimestamp();
    });

    await interaction.reply({ embeds: embeds.length > 1 ? embeds : embeds[0], ephemeral: true });
  },
};