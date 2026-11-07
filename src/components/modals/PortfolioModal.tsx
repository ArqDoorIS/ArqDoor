
// components/PortfolioModal.tsx
import React, { useEffect, useState } from "react";
import { X, Heart, MessageCircle, Share, Bookmark, Trash2, Edit2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface PortfolioItem {
  id: number;
  image_id: number;
  user_id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

export type PortfolioComment = {
  id: number;
  user: string;
  text: string;
  date: string;
  avatar?: string;
};

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PortfolioItem | null;
  imageUrl: string;
  userName: string;
  userAvatar?: string;
  viewerName: string;
  viewerAvatar?: string;
  initialLikes?: number;
  initialLiked?: boolean;
  initialComments?: PortfolioComment[];
  onDelete?: (id: number) => void;
  onEdit?: (item: PortfolioItem) => void;
  onToggleLike?: (liked: boolean) => Promise<void> | void;
  onAddComment?: (commentText: string) => Promise<void> | void;
}

export default function PortfolioModal({
  isOpen,
  onClose,
  item,
  imageUrl,
  userName,
  userAvatar,
  viewerName,
  viewerAvatar,
  initialLikes = 0,
  initialLiked = false,
  initialComments = [],
  onDelete,
  onEdit,
  onToggleLike,
  onAddComment
}: PortfolioModalProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<PortfolioComment[]>(initialComments);

  useEffect(() => {
    setLikes(initialLikes);
    setLiked(initialLiked);
    setComments(initialComments);
    setShowComments(false);
    setNewComment("");
  }, [initialComments, initialLiked, initialLikes, isOpen, item?.id]);

  if (!isOpen || !item) return null;
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return "Data inválida";
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !onAddComment) return;
    const text = newComment.trim();
    setNewComment("");
    try {
      await onAddComment(text);
    } catch (err) {
      console.error("Erro ao adicionar comentário", err);
      setNewComment(text);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddComment();
    }
  };

  const handleToggleLike = async () => {
    const nextLiked = !liked;
    const likeDiff = nextLiked ? 1 : -1;
    setLiked(nextLiked);
    setLikes((prev) => Math.max(0, prev + likeDiff));
    try {
      await onToggleLike?.(nextLiked);
    } catch (err) {
      console.error("Erro ao atualizar like", err);
      setLiked(!nextLiked);
      setLikes((prev) => Math.max(0, prev - likeDiff));
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full h-full max-w-7xl max-h-[95vh] flex items-center justify-center">
        {/* Botão de fechar */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="absolute top-4 left-4 z-20 text-white hover:bg-white/20 rounded-full w-10 h-10 p-0"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Botões de ação no canto superior direito */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(item)}
              className="text-white hover:bg-white/20 rounded-full w-10 h-10 p-0"
            >
              <Edit2 className="w-5 h-5" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(item.id)}
              className="text-white hover:bg-danger/20 rounded-full w-10 h-10 p-0"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="flex w-full h-full">
          {/* Área principal da imagem */}
          <div className={`relative transition-all duration-300 ${showComments ? 'w-3/4' : 'w-full'} h-full flex items-center justify-center group`}>
            <img
              src={imageUrl}
              alt={item.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onError={() => console.log("Erro ao carregar imagem:", imageUrl)}
            />
            
            {/* Overlay com título e descrição no hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex flex-col justify-end p-6">
              <h2 className="text-white text-2xl font-bold mb-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                {item.title}
              </h2>
              {item.description && (
                <p className="text-white/90 text-lg leading-relaxed transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                  {item.description}
                </p>
              )}
              <div className="flex items-center gap-3 mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                <Avatar className="w-8 h-8 border-2 border-white/50">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-white/20 text-white text-sm">
                    {userName}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white font-medium">{userName}</span>
                <span className="text-white/70 text-sm">
                  • {formatDate(item.created_at || (item as any).createdAt || new Date().toISOString())}
                </span>
              </div>
            </div>

            {/* Botões de ação na parte inferior */}
            <div className="absolute bottom-0 left-4 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleLike}
                className={`text-white hover:bg-white/20 rounded-full w-10 h-10 p-0 ${liked ? "bg-white/10" : ""}`}
              >
                <Heart className={`w-5 h-5 ${liked ? "fill-white" : ""}`} />
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 rounded-full w-10 h-10 p-0">
                <Share className="w-5 h-5" />
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 rounded-full w-10 h-10 p-0">
                <Bookmark className="w-5 h-5" />
              </Button>
              <span className="text-white text-sm ml-1">
                {likes} {likes === 1 ? "like" : "likes"}
              </span>
            </div>

            {/* Tarja "Ver comentários" */}
            <div className="absolute bottom-4 right-4">
              <Button
                onClick={() => setShowComments(!showComments)}
                className="bg-white/90 hover:bg-white text-ink rounded-full px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-200"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {showComments ? 'Ocultar comentários' : 'Ver comentários'}
              </Button>
            </div>
          </div>

          {/* Painel lateral de comentários */}
          {showComments && (
            <div className="w-1/4 bg-white h-full flex flex-col shadow-2xl">
              {/* Header dos comentários */}
              <div className="p-4 border-b border-line">
                <h3 className="font-semibold text-lg text-ink">Comentários</h3>
                <p className="text-sm text-muted-foreground">{comments.length} comentário{comments.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Lista de comentários */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={comment.avatar} alt={comment.user} />
                      <AvatarFallback className="bg-surface-warm text-muted-foreground text-xs">
                        {comment.user.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-surface-soft rounded-lg p-3">
                        <p className="font-medium text-sm text-ink">{comment.user}</p>
                        <p className="text-sm text-ink mt-1">{comment.text}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-3">
                        {comment.date ? new Date(comment.date).toLocaleString("pt-BR") : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Campo para novo comentário */}
              <div className="p-4 border-t border-line">
                <div className="flex gap-2">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={viewerAvatar} alt={viewerName} />
                    <AvatarFallback className="bg-brand-soft text-brand-dark text-xs">
                      {viewerName?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Adicione um comentário..."
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || !onAddComment}
                      size="sm"
                      className="bg-brand hover:bg-brand-dark text-white px-3"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
