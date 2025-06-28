// deploy-commands.js
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// Ensure your .env contains:
// DISCORD_TOKEN=your_bot_token
// CLIENT_ID=your_app_client_id
// GUILD_ID=your_test_guild_id

const commands = [
  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('👋 Hello Vault Dweller! Allow me to introduce myself.'),

  new SlashCommandBuilder()
    .setName('roll')
    .setDescription('🎲 Roll a dice (1–6)'),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('👤 Show your user info'),

  new SlashCommandBuilder()
    .setName('join')
    .setDescription('🔊 Invites me to your voice channel'),

  new SlashCommandBuilder()
    .setName('leave')
    .setDescription('👋 Makes me leave the voice channel'),

new SlashCommandBuilder()
    .setName('silo-codes')
    .setDescription('☢️ Fetch the current Fallout 76 silo launch codes.'),

  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('⏸ Pause the music'),

  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('▶️ Resume the music'),

  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('⏭ Skip the current song'),

  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('🛑 Stop music and makes me leave the voice channel'),

  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('📜 Show the current song queue'),

  new SlashCommandBuilder()
    .setName('play')
    .setDescription('🎵 Play a song from YouTube or Spotify')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('YouTube/Spotify link or search term')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('xbox-profile')
    .setDescription('🎮 Show an Xbox Live profile')
    .addStringOption(option =>
      option
        .setName('gamertag')
        .setDescription('Gamertag to look up')
        .setRequired(true)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔁 Registering ${commands.length} commands to guild ${process.env.GUILD_ID}…`);

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands },
    );

    console.log(`✅ Successfully registered commands to guild ${process.env.GUILD_ID}`);
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
