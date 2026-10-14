/* Liste pour une journée, dérivée des objets et poids déjà proposés. */
(function(root){
  const old=root.RGN_PACK_DATA;
  root.RGN_PACK_DATA={...old,groups:old.groups.filter(g=>g.id!=='refuge'),items:old.items.filter(i=>i.group!=='refuge'||i.id==='poubelle').map(i=>({...i,group:i.id==='poubelle'?'safety':i.group,quantity:i.id==='pique-nique'?1:i.quantity,note:i.id==='pique-nique'?'Un pique-nique pour vendredi. Les courses du chalet restent hors du sac de marche.':(i.note||'').replace(/au refuge/g,'aux lacs')})),scope:'Randonnée à la journée ; affaires de nuit préparées dans la page chalet.'};
})(self);
