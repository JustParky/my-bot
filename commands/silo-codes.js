const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('silo-codes')
    .setDescription('Get Fallout 76 silo codes'),
  permissions: [],
  async execute(interaction) {
    if (!fs.existsSync('./codes.json')) throw new Error('codes.json file is missing');

    async function sendOrUpdateEmbed() {
      let codes;
      try {
        codes = JSON.parse(fs.readFileSync('./codes.json', 'utf-8'));
      } catch (err) {
        throw new Error('Invalid codes.json format');
      }
      if (!Array.isArray(codes) || codes.length === 0) throw new Error('No codes found');

      const now = new Date();
      const expiryDate = new Date(Date.UTC(2025, 6, 7, 0, 0, 0)); // Midnight GMT, July 7, 2025
      const remaining = expiryDate.getTime() - now.getTime();
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((remaining / (1000 * 60)) % 60);
      const countdown = `${days}d ${hours}h ${minutes}m`;
      const expiryUnix = Math.floor(expiryDate.getTime() / 1000);
      const msg = codes.map(c => `\`\`\`🟢 ${c.description} — ${c.code}\`\`\``).join('\n');

      const embed = new EmbedBuilder()
        .setTitle('📡 NEXUS Silo Broadcast: Result Found!')
        .setDescription(msg)
        .addFields({ name: 'Codes Expire In', value: `${countdown} (Expires <t:${expiryUnix}:F>)`, inline: false })
        .setColor(0xf5d142)
        .setImage('https://i.postimg.cc/1XzJj2Vw/Chat-GPT-Image-Jul-1-2025-06-14-52-AM.png')
        .setFooter({ text: 'Thanks to NukaCrypt & Nexus AI 🤖' })
        .setTimestamp();

      return embed;
    }

    // Send initial message
    const message = await interaction.reply({ embeds: [await sendOrUpdateEmbed()], fetchReply: true });

    // Save message and channel info
    fs.writeFileSync('./silo-message.json', JSON.stringify({
      channelId: message.channelId,
      messageId: message.id,
    }));

    // Start updating
    const updateInterval = setInterval(async () => {
      try {
        if (!message.editable) {
          clearInterval(updateInterval);
          return;
        }
        await message.edit({ embeds: [await sendOrUpdateEmbed()] });
      } catch (err) {
        console.error('Error updating silo codes embed:', err.message);
        clearInterval(updateInterval);
      }
    }, 60 * 1000); // Update every minute
  },
};