const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('silo-codes')
    .setDescription('Get Fallout 76 silo codes'),
  permissions: [],
  async execute(interaction) {
    if (!fs.existsSync('./codes.json')) throw new Error('codes.json file is missing');
    let codes;
    try {
      codes = JSON.parse(fs.readFileSync('./codes.json', 'utf-8'));
    } catch (err) {
      throw new Error('Invalid codes.json format');
    }
    if (!Array.isArray(codes) || codes.length === 0) throw new Error('No codes found');
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
    let expiryDate = new Date(now);
    expiryDate.setUTCDate(now.getUTCDate() + daysUntilMonday);
    expiryDate.setUTCHours(24, 0, 0, 0);
    const expiryUnix = Math.floor(expiryDate.getTime() / 1000);
    const remaining = expiryDate.getTime() - now.getTime();
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
    const countdown = `${days}d ${hours}h ${minutes}m`;
    const msg = codes.map(c => `\`\`\`🟢 ${c.description} — ${c.code}\`\`\``).join('\n');
    const embed = new EmbedBuilder()
      .setTitle('📡 NEXUS Silo Broadcast: Result Found!')
      .setDescription(msg)
      .addFields({ name: 'These Nuke Codes Will Expire 👇', value: `<t:${expiryUnix}:F> — <t:${expiryUnix}:R>\n🕒 ${countdown}`, inline: false })
      .setColor(0xf5d142)
      .setImage('https://i.ibb.co/JFMLwZg/aaaa.png')
      .setFooter({ text: 'Data Mined by NEXUS AI v1.0 🤖' })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};