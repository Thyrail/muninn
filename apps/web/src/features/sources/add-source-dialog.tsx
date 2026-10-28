'use client';

import {
  createTextSourceSchema,
  createUrlSourceSchema,
  LIMITS,
  MAX_SOURCE_TITLE_LENGTH,
} from '@muninn/shared';
import { FileUpIcon, PlusIcon } from 'lucide-react';
import { type DragEvent, type FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { errorText } from '@/lib/api-client';
import { formString } from '@/lib/form';
import { cn } from '@/lib/utils';
import { useAddPdfSource, useAddSource } from './queries';

const MAX_MB = LIMITS.maxFileSizeBytes / 1024 / 1024;
const numberFormat = new Intl.NumberFormat('de-DE');

export function AddSourceDialog({
  notebookId,
  disabled,
}: {
  notebookId: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <PlusIcon />
          Hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quelle hinzufügen</DialogTitle>
          <DialogDescription>
            Muninn beantwortet Fragen nur aus den Quellen dieses Notebooks.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="pdf">
          <TabsList className="w-full">
            <TabsTrigger value="pdf">PDF</TabsTrigger>
            <TabsTrigger value="url">Webseite</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
          </TabsList>
          <TabsContent value="pdf" className="pt-4">
            <PdfUpload notebookId={notebookId} onDone={close} />
          </TabsContent>
          <TabsContent value="url" className="pt-4">
            <UrlForm notebookId={notebookId} onDone={close} />
          </TabsContent>
          <TabsContent value="text" className="pt-4">
            <TextForm notebookId={notebookId} onDone={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface FormProps {
  notebookId: string;
  onDone: () => void;
}

function PdfUpload({ notebookId, onDone }: FormProps) {
  const upload = useAddPdfSource(notebookId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function submit(file: File | undefined) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Es werden nur PDF-Dateien unterstützt.');
      return;
    }
    if (file.size > LIMITS.maxFileSizeBytes) {
      toast.error(`Die Datei ist zu groß. Erlaubt sind höchstens ${MAX_MB} MB.`);
      return;
    }
    upload.mutate(file, {
      onSuccess: () => {
        toast.success('PDF hochgeladen. Muninn liest es jetzt.');
        onDone();
      },
      onError: (error) => toast.error(errorText(error)),
    });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    submit(event.dataTransfer.files[0]);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors',
        dragging && 'border-primary bg-primary/5',
      )}
    >
      <FileUpIcon className="size-7 text-muted-foreground" aria-hidden />
      <p className="mt-3 text-sm font-medium">PDF hierher ziehen</p>
      <p className="mt-1 text-xs text-muted-foreground">Bis {MAX_MB} MB, mit Textebene</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? 'Wird hochgeladen …' : 'Datei auswählen'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-label="PDF-Datei auswählen"
        onChange={(event) => {
          submit(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function UrlForm({ notebookId, onDone }: FormProps) {
  const add = useAddSource(notebookId);
  const [error, setError] = useState<string>();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = formString(new FormData(event.currentTarget), 'url');
    const parsed = createUrlSourceSchema.safeParse({ type: 'URL', url });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    add.mutate(parsed.data, {
      onSuccess: () => {
        toast.success('Webseite hinzugefügt. Muninn liest sie jetzt.');
        onDone();
      },
      onError: (mutationError) => toast.error(errorText(mutationError)),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormField
        id="source-url"
        name="url"
        type="url"
        label="Adresse"
        placeholder="https://"
        description="Muninn übernimmt den Haupttext der Seite, ohne Menüs und Werbung."
        error={error}
      />
      <Button type="submit" className="w-full" disabled={add.isPending}>
        Webseite hinzufügen
      </Button>
    </form>
  );
}

function TextForm({ notebookId, onDone }: FormProps) {
  const add = useAddSource(notebookId);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = formString(new FormData(event.currentTarget), 'title');
    const parsed = createTextSourceSchema.safeParse({
      type: 'TEXT',
      text,
      title: title || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    add.mutate(parsed.data, {
      onSuccess: () => {
        toast.success('Text hinzugefügt.');
        onDone();
      },
      onError: (mutationError) => toast.error(errorText(mutationError)),
    });
  }

  const tooLong = text.length > LIMITS.maxTextChars;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormField
        id="source-title"
        name="title"
        label="Titel (optional)"
        maxLength={MAX_SOURCE_TITLE_LENGTH}
      />
      <div className="space-y-2">
        <Label htmlFor="source-text">Text</Label>
        <Textarea
          id="source-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          className="max-h-72"
          aria-invalid={error || tooLong ? true : undefined}
          aria-describedby="source-text-hint"
        />
        <p
          id="source-text-hint"
          className={cn('text-xs text-muted-foreground', (error || tooLong) && 'text-destructive')}
        >
          {error ??
            `${numberFormat.format(text.length)} / ${numberFormat.format(LIMITS.maxTextChars)} Zeichen`}
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={add.isPending || tooLong}>
        Text hinzufügen
      </Button>
    </form>
  );
}
